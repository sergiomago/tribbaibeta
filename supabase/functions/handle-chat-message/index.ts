import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import OpenAI from "https://esm.sh/openai@4.26.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { buildResponseChain, validateChainOrder, updateChainProgress } from "./responseChainManager.ts";
import { compileMessageContext, updateContextualMemory } from "./contextCompiler.ts";

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
      console.error('Missing required environment variables');
      throw new Error('Missing required environment variables');
    }

    const { threadId, content, taggedRoleId } = await req.json();
    console.log('Request payload:', { threadId, content, taggedRoleId });

    if (!threadId || !content) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const openai = new OpenAI({ apiKey: openaiKey });

    // Save user message
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        thread_id: threadId,
        content,
        tagged_role_id: taggedRoleId || null,
        metadata: {
          timestamp: new Date().toISOString(),
          type: 'user_message'
        }
      })
      .select()
      .single();

    if (messageError) {
      console.error('Error saving message:', messageError);
      throw messageError;
    }

    // Get thread roles
    const { data: threadRoles, error: threadRolesError } = await supabase
      .from('thread_roles')
      .select('role_id')
      .eq('thread_id', threadId);

    if (threadRolesError) {
      console.error('Error fetching thread roles:', threadRolesError);
      throw threadRolesError;
    }

    if (!threadRoles?.length) {
      console.error('No roles found for thread');
      return new Response(
        JSON.stringify({ error: 'No roles available in thread' }), 
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get best responding roles
    const { data: respondingRoles, error: rolesError } = await supabase.rpc(
      'get_best_responding_role',
      { 
        p_thread_id: threadId,
        p_context: content,
        p_threshold: 0.3
      }
    );

    if (rolesError) {
      console.error('Error getting responding roles:', rolesError);
      throw rolesError;
    }

    // If no roles meet threshold, select random role
    let selectedRoleId = respondingRoles?.[0]?.role_id;
    if (!selectedRoleId) {
      selectedRoleId = threadRoles[Math.floor(Math.random() * threadRoles.length)].role_id;
      console.log('Using fallback random role:', selectedRoleId);
    }

    // Get role details
    const { data: role, error: roleError } = await supabase
      .from('roles')
      .select('*')
      .eq('id', selectedRoleId)
      .single();

    if (roleError || !role) {
      console.error('Error fetching role:', roleError);
      throw roleError || new Error('Role not found');
    }

    // Compile context
    const context = await compileMessageContext(supabase, threadId, selectedRoleId, content);
    console.log('Context compiled for role:', { roleId: selectedRoleId, contextSize: context.memories?.length });

    // Generate response
    const completion = await openai.chat.completions.create({
      model: role.model || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `${role.instructions}\n\nConsider this context from previous interactions:\n${
            context.memories?.map(m => `- ${m.content}`).join('\n') || 'No previous context available.'
          }`
        },
        { role: 'user', content }
      ],
    });

    const responseContent = completion.choices[0].message.content;
    console.log('Generated response for role:', { roleId: selectedRoleId, responseLength: responseContent?.length });

    // Save role's response
    const { data: response, error: responseError } = await supabase
      .from('messages')
      .insert({
        thread_id: threadId,
        role_id: selectedRoleId,
        content: responseContent,
        chain_id: message.id,
        metadata: {
          timestamp: new Date().toISOString(),
          conversation_depth: context.conversationDepth || 1,
          context_used: context
        }
      })
      .select()
      .single();

    if (responseError) {
      console.error('Error saving response:', responseError);
      throw responseError;
    }

    // Record interaction
    const { error: interactionError } = await supabase
      .from('role_interactions')
      .insert({
        thread_id: threadId,
        initiator_role_id: selectedRoleId,
        responder_role_id: taggedRoleId || selectedRoleId,
        interaction_type: taggedRoleId ? 'direct_response' : 'chain_response',
        metadata: {
          message_id: message.id,
          response_id: response.id,
          conversation_depth: context.conversationDepth || 1
        }
      });

    if (interactionError) {
      console.error('Error recording interaction:', interactionError);
      // Don't throw here, as the main functionality succeeded
    }

    // Update memory
    try {
      await updateContextualMemory(supabase, selectedRoleId, responseContent, context);
    } catch (memoryError) {
      console.error('Error updating memory:', memoryError);
      // Don't throw here, as the main functionality succeeded
    }

    return new Response(
      JSON.stringify({ success: true }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in handle-chat-message:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        details: error instanceof Error ? error.stack : undefined
      }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});