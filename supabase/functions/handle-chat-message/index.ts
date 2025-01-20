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

    // Save user message
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        thread_id: threadId,
        content,
        tagged_role_id: taggedRoleId || null,
      })
      .select('id, thread_id, content, tagged_role_id')
      .single();

    if (messageError) throw messageError;

    // Get responding roles based on new protocol
    let respondingRoles;
    if (taggedRoleId) {
      // Direct tagging - single role response
      respondingRoles = [{
        role_id: taggedRoleId,
        score: 1.0,
        chain_order: 1
      }];
    } else {
      // Get best responding roles (max 3)
      const { data: roles } = await supabase.rpc(
        'get_best_responding_role',
        { 
          p_thread_id: threadId,
          p_context: content,
          p_threshold: 0.3,
          p_max_roles: 3
        }
      );
      respondingRoles = roles;
    }

    console.log('Selected responding roles:', respondingRoles);

    // Update conversation state with leader
    if (respondingRoles?.length) {
      await supabase
        .from('conversation_states')
        .update({ 
          current_leader_role_id: respondingRoles[0].role_id,
          topic_context: {
            current_topic: content.slice(0, 100),
            timestamp: new Date().toISOString()
          }
        })
        .eq('thread_id', threadId);
    }

    // Process responses for each role
    for (const roleData of (respondingRoles || [])) {
      try {
        // Get role details
        const { data: role } = await supabase
          .from('roles')
          .select('id, name, instructions, model, tag, special_capabilities, primary_topics')
          .eq('id', roleData.role_id)
          .single();

        if (!role) continue;

        // Get relevant context
        const { data: previousMessages } = await supabase
          .from('messages')
          .select('content, role:roles(name)')
          .eq('thread_id', threadId)
          .order('created_at', { ascending: false })
          .limit(5);

        const conversationContext = previousMessages
          ?.map(msg => `${msg.role?.name || 'User'}: ${msg.content}`)
          .reverse()
          .join('\n');

        // Build role-specific prompt
        const isLeader = roleData.chain_order === 1;
        const systemPrompt = `${role.instructions}\n\n${
          isLeader ? 
          "You are the lead responder. Provide a comprehensive response." :
          "You are a supporting responder. Only add unique insights that haven't been covered by previous responses."
        }\n\nRecent conversation:\n${conversationContext}`;

        // Generate response
        const completion = await openai.chat.completions.create({
          model: role.model || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content }
          ],
        });

        const responseContent = completion.choices[0].message.content;

        // Save role's response
        const { data: roleResponse, error: responseError } = await supabase
          .from('messages')
          .insert({
            thread_id: threadId,
            role_id: role.id,
            content: responseContent,
            chain_id: message.id,
            chain_order: roleData.chain_order,
            metadata: {
              was_leader: isLeader,
              relevance_score: roleData.score,
              response_type: isLeader ? 'lead_response' : 'supporting_response',
              timestamp: new Date().toISOString()
            }
          })
          .select('id')
          .single();

        if (responseError) throw responseError;

        // Record interaction
        await supabase
          .from('role_interactions')
          .insert({
            thread_id: threadId,
            initiator_role_id: role.id,
            responder_role_id: taggedRoleId || role.id,
            interaction_type: isLeader ? 'lead_response' : 'supporting_response',
            was_leader: isLeader,
            response_quality_score: roleData.score,
            topic_match_score: roleData.score,
            metadata: {
              chain_position: roleData.chain_order,
              response_type: isLeader ? 'lead_response' : 'supporting_response'
            }
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