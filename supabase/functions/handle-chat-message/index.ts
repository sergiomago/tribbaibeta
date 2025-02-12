
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import OpenAI from "https://esm.sh/openai@4.26.0";
import { buildMemoryContext } from "./memoryContextBuilder.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const llongtermApiKey = Deno.env.get('LLONGTERM_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }

  try {
    if (!openAIApiKey) throw new Error('OpenAI API key is not configured');
    if (!supabaseUrl || !supabaseServiceKey) throw new Error('Supabase configuration is missing');
    if (!llongtermApiKey) throw new Error('Llongterm API key is not configured');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const openai = new OpenAI({ apiKey: openAIApiKey });
    
    const { threadId, content, chain, taggedRoleId } = await req.json();
    console.log('Processing message:', { threadId, content, chain, taggedRoleId });

    if (!threadId || !content) {
      throw new Error('Missing required fields: threadId and content are required');
    }

    // First check if a mind exists for the role, if not create the mind record first
    async function getOrCreateMindId(roleId: string) {
      const { data: existingMind } = await supabase
        .from('role_minds')
        .select('mind_id')
        .eq('role_id', roleId)
        .eq('status', 'active')
        .maybeSingle();

      if (existingMind?.mind_id) {
        console.log('Using existing mind:', existingMind.mind_id);
        return existingMind.mind_id;
      }

      // Create a new mind record first
      const { data: mindRecord, error: mindError } = await supabase
        .from('role_minds')
        .insert({
          role_id: roleId,
          mind_id: 'pending',
          status: 'processing'
        })
        .select()
        .single();

      if (mindError) {
        console.error('Failed to create mind record:', mindError);
        throw new Error('Failed to create mind record');
      }

      // Now create the actual mind in Llongterm
      try {
        console.log('Creating new Llongterm mind for role:', roleId);
        const response = await fetch('https://api.llongterm.com/v1/minds', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${llongtermApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            specialism: 'AI Assistant',
            metadata: {
              roleId,
              threadId,
              created: new Date().toISOString()
            }
          })
        });

        if (!response.ok) {
          throw new Error(`Llongterm API error: ${response.statusText}`);
        }

        const mindData = await response.json();
        console.log('Mind created successfully:', mindData);

        // Update the mind record with the actual mind ID
        const { error: updateError } = await supabase
          .from('role_minds')
          .update({
            mind_id: mindData.mindId,
            status: 'active',
            metadata: {
              created_at: new Date().toISOString(),
              threadId
            }
          })
          .eq('id', mindRecord.id);

        if (updateError) {
          console.error('Failed to update mind record:', updateError);
          throw new Error('Failed to update mind record');
        }

        return mindData.mindId;
      } catch (error) {
        console.error('Error creating Llongterm mind:', error);
        // Update the mind record to failed state
        await supabase
          .from('role_minds')
          .update({
            status: 'failed',
            error_message: error.message
          })
          .eq('id', mindRecord.id);
        throw error;
      }
    }

    // If a role is tagged, only that role responds
    if (taggedRoleId) {
      const { data: role } = await supabase
        .from('roles')
        .select('*')
        .eq('id', taggedRoleId)
        .single();

      if (!role) throw new Error('Tagged role not found');

      // Get or create mind for this role
      const mindId = await getOrCreateMindId(taggedRoleId);
      console.log('Using mind:', mindId);

      // Store the message in Llongterm
      const memoryResponse = await fetch(`https://api.llongterm.com/v1/minds/${mindId}/memories`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${llongtermApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content,
          metadata: {
            threadId,
            timestamp: new Date().toISOString(),
            type: 'user_message'
          }
        })
      });

      if (!memoryResponse.ok) {
        console.error('Failed to store memory in Llongterm');
      }

      // Get memory context
      const { enrichedMessage, systemContext } = await buildMemoryContext(
        supabase,
        openai,
        threadId,
        taggedRoleId,
        content,
        mindId
      );

      const completion = await openai.chat.completions.create({
        model: role.model || 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: `${role.instructions}\n\n${systemContext}`
          },
          { role: 'user', content: enrichedMessage }
        ],
      });

      const responseContent = completion.choices[0].message.content;

      // Store AI response
      await supabase
        .from('messages')
        .insert({
          thread_id: threadId,
          role_id: taggedRoleId,
          content: responseContent,
          chain_position: 1,
          metadata: {
            mindId,
            hasMemoryContext: true
          }
        });

      // Store AI response in Llongterm
      await fetch(`https://api.llongterm.com/v1/minds/${mindId}/memories`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${llongtermApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: responseContent,
          metadata: {
            threadId,
            timestamp: new Date().toISOString(),
            type: 'ai_response'
          }
        })
      });

      return new Response(
        JSON.stringify({ success: true }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process roles in order from the chain
    let chainResponses = [];
    for (const [index, { role_id }] of chain.entries()) {
      try {
        const { data: role } = await supabase
          .from('roles')
          .select('*')
          .eq('id', role_id)
          .single();

        if (!role) {
          console.error(`Role ${role_id} not found`);
          continue;
        }

        // Get or create mind for this role
        const mindId = await getOrCreateMindId(role_id);
        console.log('Using mind for chain response:', mindId);

        // Store user message in Llongterm for this role
        await fetch(`https://api.llongterm.com/v1/minds/${mindId}/memories`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${llongtermApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            content,
            metadata: {
              threadId,
              timestamp: new Date().toISOString(),
              type: 'user_message',
              chainPosition: index
            }
          })
        });

        // Build context including previous responses in the chain
        const { enrichedMessage, systemContext } = await buildMemoryContext(
          supabase,
          openai,
          threadId,
          role_id,
          content,
          mindId
        );

        // Add previous responses from the chain to the context
        const contextWithChainResponses = chainResponses.length > 0 
          ? `${enrichedMessage}\n\nPrevious responses in this conversation:\n${chainResponses.map(r => 
              `${r.roleName}: ${r.content}`
            ).join('\n\n')}`
          : enrichedMessage;

        const completion = await openai.chat.completions.create({
          model: role.model || 'gpt-4o-mini',
          messages: [
            { 
              role: 'system', 
              content: `${role.instructions}\n\n${systemContext}`
            },
            { role: 'user', content: contextWithChainResponses }
          ],
        });

        const responseContent = completion.choices[0].message.content;

        // Store response
        await supabase
          .from('messages')
          .insert({
            thread_id: threadId,
            role_id: role_id,
            content: responseContent,
            chain_position: index + 1,
            metadata: {
              mindId,
              hasMemoryContext: true
            }
          });

        // Store AI response in Llongterm
        await fetch(`https://api.llongterm.com/v1/minds/${mindId}/memories`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${llongtermApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            content: responseContent,
            metadata: {
              threadId,
              timestamp: new Date().toISOString(),
              type: 'ai_response',
              chainPosition: index + 1
            }
          })
        });

        // Add this response to the chain for next roles
        chainResponses.push({
          roleName: role.name,
          content: responseContent
        });

      } catch (error) {
        console.error(`Error processing response for role ${role_id}:`, error);
        throw error;
      }
    }

    return new Response(
      JSON.stringify({ success: true }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in handle-chat-message:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An error occurred while processing your request.',
        details: error.toString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
