
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

    // Get roles data first
    const { data: roles, error: rolesError } = await supabase
      .from('roles')
      .select('*')
      .in('id', chain.map(c => c.role_id));

    if (rolesError) throw rolesError;
    if (!roles?.length) throw new Error('No roles found');

    // Process responses sequentially
    for (const [index, { role_id }] of chain.entries()) {
      try {
        const currentRole = roles.find(r => r.id === role_id);
        if (!currentRole) {
          console.error(`Role ${role_id} not found`);
          continue;
        }

        // Get conversation history with a reasonable limit
        const { data: history } = await supabase
          .from('messages')
          .select('content, created_at')
          .eq('thread_id', threadId)
          .order('created_at', { ascending: false })
          .limit(5);

        const conversationThread = history?.map(msg => ({
          role: 'user',
          content: msg.content
        })) || [];

        // Generate response
        const completion = await openai.chat.completions.create({
          model: currentRole.model || 'gpt-4o-mini',
          messages: [
            { 
              role: 'system', 
              content: `You are ${currentRole.name}, an expert in ${currentRole.expertise_areas?.join(', ')}.
                
                Your role instructions:
                ${currentRole.instructions}
                
                Guidelines:
                1. Stay within your expertise areas
                2. Be natural and conversational
                3. Be concise but informative`
            },
            ...conversationThread,
            { role: 'user', content }
          ],
        });

        const responseContent = completion.choices[0].message.content;

        // Store response
        const { error: responseError } = await supabase
          .from('messages')
          .insert({
            thread_id: threadId,
            role_id: role_id,
            content: responseContent,
            chain_position: index + 1
          });

        if (responseError) throw responseError;

        // Store memory separately
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
