
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import OpenAI from "https://esm.sh/openai@4.26.0";
import { buildMemoryContext } from "./memoryContextBuilder.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

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

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const openai = new OpenAI({ apiKey: openAIApiKey });
    
    const { threadId, content, chain, taggedRoleId } = await req.json();
    console.log('Processing message:', { threadId, content, chain, taggedRoleId });

    if (!threadId || !content) {
      throw new Error('Missing required fields: threadId and content are required');
    }

    // If a role is tagged, only that role responds
    if (taggedRoleId) {
      const { data: role } = await supabase
        .from('roles')
        .select('*')
        .eq('id', taggedRoleId)
        .single();

      if (!role) throw new Error('Tagged role not found');

      const { enrichedMessage, systemContext } = await buildMemoryContext(
        supabase,
        openai,
        threadId,
        taggedRoleId,
        content
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

      await supabase
        .from('messages')
        .insert({
          thread_id: threadId,
          role_id: taggedRoleId,
          content: responseContent,
          chain_position: 1
        });

      await supabase
        .from('role_memories')
        .insert({
          role_id: taggedRoleId,
          content: responseContent,
          context_type: 'conversation',
          metadata: {
            thread_id: threadId,
            timestamp: new Date().toISOString(),
            chain_position: 1
          }
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

        // Build context including previous responses in the chain
        const { enrichedMessage, systemContext } = await buildMemoryContext(
          supabase,
          openai,
          threadId,
          role_id,
          content
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
            chain_position: index + 1
          });

        // Store memory
        await supabase
          .from('role_memories')
          .insert({
            role_id: role_id,
            content: responseContent,
            context_type: 'conversation',
            metadata: {
              thread_id: threadId,
              timestamp: new Date().toISOString(),
              chain_position: index + 1
            }
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
