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
      throw new Error('Configuration error: Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const openai = new OpenAI({ apiKey: openaiKey });

    const { threadId, content, taggedRoleId } = await req.json();
    console.log('Processing message:', { threadId, content, taggedRoleId });

    if (!threadId || !content) {
      throw new Error('Missing required fields: threadId and content are required');
    }

    // Save user message
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        thread_id: threadId,
        content,
        tagged_role_id: taggedRoleId || null,
      })
      .select(`
        messages.id,
        messages.content,
        messages.thread_id,
        messages.tagged_role_id,
        messages.role_id,
        sender:roles!messages_role_id_fkey (
          id,
          name,
          tag,
          instructions
        )
      `)
      .single();

    if (messageError) {
      console.error('Error saving message:', messageError);
      throw messageError;
    }

    // Get responding roles using improved selection
    const { data: respondingRoles, error: rolesError } = await supabase.rpc(
      'get_best_responding_role',
      {
        p_thread_id: threadId,
        p_context: content,
        p_threshold: 0.3,
        p_max_roles: taggedRoleId ? 1 : 3
      }
    );

    if (rolesError) {
      console.error('Error getting responding roles:', rolesError);
      throw rolesError;
    }

    if (!respondingRoles?.length) {
      throw new Error('No suitable roles found for response');
    }

    // Process responses in order
    for (const { role_id, chain_order } of respondingRoles) {
      // Get role details
      const { data: role, error: roleError } = await supabase
        .from('roles')
        .select(`
          id,
          name,
          instructions,
          model,
          tag,
          special_capabilities
        `)
        .eq('id', role_id)
        .single();

      if (roleError || !role) {
        console.error(`Role ${role_id} not found:`, roleError);
        continue;
      }

      // Get relevant memories for context
      const { data: memories, error: memoriesError } = await supabase.rpc(
        'get_similar_memories',
        {
          p_embedding: content,
          p_match_threshold: 0.7,
          p_match_count: 5,
          p_role_id: role_id
        }
      );

      if (memoriesError) {
        console.error('Error fetching memories:', memoriesError);
      }

      const memoryContext = memories?.length 
        ? `Relevant context from your memory:\n${memories.map(m => m.content).join('\n\n')}`
        : '';

      // Generate response
      const completion = await openai.chat.completions.create({
        model: role.model || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `${role.instructions}\n\n${memoryContext}`
          },
          { role: 'user', content }
        ],
      });

      const responseContent = completion.choices[0].message.content;

      // Save role's response
      const { data: roleResponse, error: responseError } = await supabase
        .from('messages')
        .insert({
          thread_id: threadId,
          role_id: role_id,
          content: responseContent,
          chain_id: message.id,
          chain_order,
        })
        .select(`
          messages.id,
          messages.content,
          messages.thread_id,
          messages.role_id,
          messages.chain_id,
          messages.chain_order,
          responder:roles!messages_role_id_fkey (
            id,
            name,
            tag,
            instructions
          )
        `)
        .single();

      if (responseError) {
        console.error('Error saving role response:', responseError);
        throw responseError;
      }

      // Store response in role's memory
      await supabase
        .from('role_memories')
        .insert({
          role_id: role_id,
          content: responseContent,
          context_type: 'conversation',
          metadata: {
            message_id: roleResponse.id,
            thread_id: threadId,
            chain_order: chain_order
          }
        });

      // Record interaction
      await supabase
        .from('role_interactions')
        .insert({
          thread_id: threadId,
          initiator_role_id: role_id,
          responder_role_id: taggedRoleId || role_id,
          interaction_type: taggedRoleId ? 'direct_response' : 'analysis_based',
          chain_position: chain_order,
          effectiveness_score: 1.0,
          metadata: {
            context_type: 'conversation',
            memory_count: memories?.length || 0
          }
        });
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