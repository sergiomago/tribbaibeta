import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import OpenAI from "https://esm.sh/openai@4.26.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const openaiKey = Deno.env.get('OPENAI_API_KEY');

    if (!supabaseUrl || !supabaseKey || !openaiKey) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const openai = new OpenAI({ apiKey: openaiKey });

    const { threadId, content, taggedRoleId } = await req.json();
    console.log('Processing message:', { threadId, content, taggedRoleId });

    if (!threadId || !content) {
      throw new Error('Missing required fields: threadId and content are required');
    }

    // Step 1: Save user message
    const { data: userMessage, error: messageError } = await supabase
      .from('messages')
      .insert({
        thread_id: threadId,
        content,
        tagged_role_id: taggedRoleId || null,
      })
      .select('id, thread_id, content, tagged_role_id')
      .single();

    if (messageError) throw messageError;

    // Step 2: Get responding roles in order
    const { data: respondingRoles } = await supabase.rpc(
      'get_best_responding_role',
      { 
        p_thread_id: threadId,
        p_context: content,
        p_threshold: 0.3,
        p_max_roles: 3
      }
    );

    if (!respondingRoles?.length) {
      console.log('No suitable roles found to respond');
      return new Response(
        JSON.stringify({ success: true, message: 'No roles available to respond' }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Responding roles:', respondingRoles);

    // Step 3: Process responses sequentially
    for (const roleData of respondingRoles) {
      try {
        // Get role details
        const { data: role } = await supabase
          .from('roles')
          .select('*')
          .eq('id', roleData.role_id)
          .single();

        if (!role) {
          console.log(`Role ${roleData.role_id} not found, skipping`);
          continue;
        }

        // Get relevant memories
        const { data: memories } = await supabase.rpc(
          'get_similar_memories',
          {
            p_embedding: content,
            p_match_threshold: 0.7,
            p_match_count: 5,
            p_role_id: role.id
          }
        );

        // Get previous responses in this chain
        const { data: previousResponses } = await supabase
          .from('messages')
          .select('content, role:roles(name)')
          .eq('thread_id', threadId)
          .eq('chain_id', userMessage.id)
          .order('chain_order', { ascending: true });

        // Prepare context for the role
        const memoryContext = memories?.length 
          ? `Relevant context from your memory:\n${memories.map(m => m.content).join('\n\n')}`
          : '';

        const previousResponsesContext = previousResponses?.length
          ? `Previous responses in this conversation:\n${previousResponses.map(r => 
              `${r.role.name}: ${r.content}`
            ).join('\n')}`
          : '';

        // Generate response
        const completion = await openai.chat.completions.create({
          model: role.model || 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `${role.instructions}\n\n${memoryContext}\n\n${previousResponsesContext}`
            },
            { role: 'user', content }
          ],
        });

        const responseContent = completion.choices[0].message.content;

        // Save role's response
        const { data: savedResponse, error: responseError } = await supabase
          .from('messages')
          .insert({
            thread_id: threadId,
            role_id: role.id,
            content: responseContent,
            chain_id: userMessage.id,
            chain_order: roleData.chain_order
          })
          .select('id')
          .single();

        if (responseError) throw responseError;

        // Store memory
        await supabase
          .from('role_memories')
          .insert({
            role_id: role.id,
            content: responseContent,
            context_type: 'conversation',
            metadata: {
              message_id: savedResponse.id,
              thread_id: threadId,
              chain_order: roleData.chain_order,
              user_message: content
            }
          });

        // Record interaction
        await supabase
          .from('role_interactions')
          .insert({
            thread_id: threadId,
            initiator_role_id: role.id,
            responder_role_id: null,
            interaction_type: 'chain_response',
            chain_position: roleData.chain_order,
            effectiveness_score: roleData.score
          });

      } catch (error) {
        console.error(`Error processing response for role ${roleData.role_id}:`, error);
        continue;
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
        error: error.message || 'An unknown error occurred',
        details: error.stack
      }), 
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});