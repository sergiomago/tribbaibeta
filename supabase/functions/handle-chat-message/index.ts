
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import OpenAI from "https://esm.sh/openai@4.26.0";
import Llongterm from "https://esm.sh/llongterm@latest";

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
    const llongterm = new Llongterm({
      keys: { llongterm: llongtermApiKey }
    });
    
    const { threadId, content, chain, taggedRoleId } = await req.json();
    console.log('Processing message:', { threadId, content, chain, taggedRoleId });

    if (!threadId || !content) {
      throw new Error('Missing required fields: threadId and content are required');
    }

    async function getOrCreateMindId(roleId: string) {
      try {
        // First check for existing mind
        const { data: existingMind } = await supabase
          .from('role_minds')
          .select('mind_id, status')
          .eq('role_id', roleId)
          .eq('status', 'active')
          .maybeSingle();

        if (existingMind?.mind_id) {
          console.log('Using existing mind:', existingMind.mind_id);
          return existingMind.mind_id;
        }

        // Get role details for mind creation
        const { data: role } = await supabase
          .from('roles')
          .select('name, description, instructions, expertise_areas, special_capabilities')
          .eq('id', roleId)
          .single();

        if (!role) throw new Error('Role not found');

        // Create the mind using proper configuration
        const mind = await llongterm.create({
          specialism: role.name,
          specialismDepth: 2,
          initialMemory: {
            summary: role.description || '',
            structured: {
              [role.name]: {
                instructions: role.instructions,
                expertise_areas: role.expertise_areas,
                capabilities: role.special_capabilities
              }
            },
            unstructured: {}
          },
          metadata: {
            roleId,
            threadId,
            created: new Date().toISOString()
          }
        });

        console.log('Mind created in Llongterm:', mind);

        // Store the mind reference
        const { error: updateError } = await supabase
          .from('role_minds')
          .insert({
            role_id: roleId,
            mind_id: mind.id,
            status: 'active',
            metadata: {
              role_details: role
            }
          });

        if (updateError) {
          await llongterm.delete(mind.id);
          throw updateError;
        }

        return mind.id;
      } catch (error) {
        console.error('Error in getOrCreateMindId:', error);
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

      try {
        const mindId = await getOrCreateMindId(taggedRoleId);
        const mind = await llongterm.get(mindId);

        // Store the message in Llongterm
        await mind.remember([{
          author: 'user',
          message: content,
          metadata: {
            threadId,
            timestamp: new Date().toISOString(),
            type: 'user_message'
          }
        }]);

        // Get enriched context from Llongterm
        const knowledgeResponse = await mind.ask(content);
        
        // Generate response using OpenAI
        const completion = await openai.chat.completions.create({
          model: 'gpt-4',
          messages: [
            { 
              role: 'system', 
              content: `${role.instructions}\n\nContext from previous interactions:\n${knowledgeResponse.relevantMemories.join('\n\n')}`
            },
            { role: 'user', content }
          ],
        });

        const responseContent = completion.choices[0].message.content;

        // Store AI response reference in Supabase
        await supabase
          .from('messages')
          .insert({
            thread_id: threadId,
            role_id: taggedRoleId,
            content: responseContent,
            metadata: {
              mindId,
              hasLlongtermContext: true
            }
          });

        // Store AI response in Llongterm
        await mind.remember([{
          author: 'assistant',
          message: responseContent,
          metadata: {
            threadId,
            timestamp: new Date().toISOString(),
            type: 'ai_response'
          }
        }]);

        return new Response(
          JSON.stringify({ success: true }), 
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        console.error('Error processing tagged role response:', error);
        throw error;
      }
    }

    // Handle chain responses similarly to tagged responses
    for (const [index, { role_id }] of chain.entries()) {
      const mindId = await getOrCreateMindId(role_id);
      const mind = await llongterm.get(mindId);
      
      // Get context and generate response using the same pattern as above
      const knowledgeResponse = await mind.ask(content);
      
      const { data: role } = await supabase
        .from('roles')
        .select('*')
        .eq('id', role_id)
        .single();

      if (!role) continue;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { 
            role: 'system', 
            content: `${role.instructions}\n\nContext from previous interactions:\n${knowledgeResponse.relevantMemories.join('\n\n')}`
          },
          { role: 'user', content }
        ],
      });

      const responseContent = completion.choices[0].message.content;

      // Store message reference
      await supabase
        .from('messages')
        .insert({
          thread_id: threadId,
          role_id: role_id,
          content: responseContent,
          chain_position: index + 1,
          metadata: {
            mindId,
            hasLlongtermContext: true
          }
        });

      // Store in Llongterm
      await mind.remember([{
        author: 'assistant',
        message: responseContent,
        metadata: {
          threadId,
          timestamp: new Date().toISOString(),
          type: 'ai_response',
          chainPosition: index + 1
        }
      }]);
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
