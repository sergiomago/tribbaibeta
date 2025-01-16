import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import OpenAI from "https://esm.sh/openai@4.26.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function handleInitialAnalysis(supabase: any, threadId: string, content: string, openai: OpenAI) {
  console.log('Performing initial analysis...');
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'Analyze the user message and determine the primary intent and any special requirements.'
      },
      { role: 'user', content }
    ],
  });

  const analysis = completion.choices[0].message.content;
  
  await supabase
    .from('conversation_states')
    .update({
      current_state: 'role_selection',
      metadata: { analysis, original_message: content }
    })
    .eq('thread_id', threadId);

  return analysis;
}

async function selectResponders(supabase: any, threadId: string, analysis: string, openai: OpenAI) {
  console.log('Selecting responders based on analysis...');
  
  const { data: availableRoles } = await supabase
    .from('thread_roles')
    .select('role_id, roles(*)') 
    .eq('thread_id', threadId);

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `Select the most appropriate roles to handle this conversation from: ${
          availableRoles.map(r => `${r.roles.name} (${r.roles.tag})`).join(', ')
        }`
      },
      { role: 'user', content: analysis }
    ],
  });

  const selectedRoles = availableRoles
    .filter(role => completion.choices[0].message.content.includes(role.roles.tag))
    .map(role => role.role_id);

  await supabase
    .from('conversation_states')
    .update({
      current_state: 'response_generation',
      active_roles: selectedRoles
    })
    .eq('thread_id', threadId);

  return selectedRoles;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY'),
    });

    const { threadId, content, taggedRoleId } = await req.json();
    console.log('Received request:', { threadId, content, taggedRoleId });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Initialize or get conversation state
    const { data: state } = await supabase
      .from('conversation_states')
      .select('*')
      .eq('thread_id', threadId)
      .maybeSingle();

    if (!state) {
      await supabase
        .from('conversation_states')
        .insert({
          thread_id: threadId,
          current_state: 'initial_analysis'
        });
    }

    // Save user message
    const { data: userMessage, error: messageError } = await supabase
      .from('messages')
      .insert({
        thread_id: threadId,
        content,
        tagged_role_id: taggedRoleId || null,
      })
      .select()
      .single();

    if (messageError) throw messageError;

    // Handle conversation based on state
    let analysis;
    let selectedRoles;

    if (!taggedRoleId) {
      // Perform initial analysis
      analysis = await handleInitialAnalysis(supabase, threadId, content, openai);
      
      // Select appropriate responders
      selectedRoles = await selectResponders(supabase, threadId, analysis, openai);
    } else {
      selectedRoles = [taggedRoleId];
    }

    // Generate responses from selected roles
    for (const roleId of selectedRoles) {
      const { data: role } = await supabase
        .from('roles')
        .select('*')
        .eq('id', roleId)
        .single();

      if (!role) continue;

      // Get relevant memories
      const { data: memories } = await supabase
        .rpc('get_similar_memories', {
          p_embedding: content,
          p_match_threshold: 0.7,
          p_match_count: 5,
          p_role_id: roleId
        });

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

      // Save response
      await supabase
        .from('messages')
        .insert({
          thread_id: threadId,
          role_id: roleId,
          content: responseContent,
          chain_id: userMessage.id,
        });

      // Store in role's memory
      await supabase
        .from('role_memories')
        .insert({
          role_id: roleId,
          content: responseContent,
          context_type: 'conversation',
          metadata: {
            thread_id: threadId,
            user_message: content,
            timestamp: new Date().getTime(),
          }
        });

      // Record interaction
      await supabase
        .from('role_interactions')
        .insert({
          thread_id: threadId,
          initiator_role_id: roleId,
          responder_role_id: taggedRoleId || roleId,
          interaction_type: taggedRoleId ? 'direct_response' : 'analysis_based',
        });
    }

    // Update state to completion
    await supabase
      .from('conversation_states')
      .update({
        current_state: 'completion',
        metadata: {
          last_message_id: userMessage.id,
          completion_time: new Date().toISOString()
        }
      })
      .eq('thread_id', threadId);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in handle-chat-message:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'An unknown error occurred',
      details: error instanceof Error ? error.stack : undefined
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});