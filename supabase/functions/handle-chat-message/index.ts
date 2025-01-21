import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import OpenAI from "https://esm.sh/openai@4.26.0";

const MAX_RECURSION_DEPTH = 3;

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

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);
    const openai = new OpenAI({ apiKey: openaiKey });

    const { threadId, content, taggedRoleId } = await req.json();
    console.log('Processing message:', { threadId, content, taggedRoleId });

    // Save user message
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

    // Get chain depth to prevent infinite recursion
    const { data: chainDepth } = await supabase.rpc(
      'get_chain_depth',
      { 
        p_thread_id: threadId,
        p_chain_id: userMessage.id
      }
    );

    if (chainDepth > MAX_RECURSION_DEPTH) {
      console.log('Maximum recursion depth exceeded');
      return new Response(
        JSON.stringify({ success: true, message: 'Maximum depth exceeded' }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get responding roles
    let respondingRoles;
    if (taggedRoleId) {
      // If a role is tagged, only that role responds
      respondingRoles = [{
        role_id: taggedRoleId,
        score: 1.0,
        chain_order: 1
      }];
    } else {
      // Get best responding roles based on context
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

    if (!respondingRoles?.length) {
      console.log('No suitable roles found to respond');
      return new Response(
        JSON.stringify({ success: true, message: 'No roles available to respond' }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Responding roles:', respondingRoles);

    // Process responses sequentially
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

        // Get conversation history
        const { data: history } = await supabase.rpc(
          'get_conversation_history',
          {
            p_thread_id: threadId,
            p_limit: 10
          }
        );

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

        // Prepare context
        const memoryContext = memories?.length 
          ? `Relevant context from your memory:\n${memories.map(m => m.content).join('\n\n')}`
          : '';

        const historyContext = history?.length
          ? `Recent conversation history:\n${history.map(m => 
              `${m.role ? 'Assistant' : 'User'}: ${m.content}`
            ).join('\n')}`
          : '';

        // Generate response
        const completion = await openai.chat.completions.create({
          model: role.model || 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `${role.instructions}\n\n${memoryContext}\n\n${historyContext}`
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

        // Check for tagged roles in response and handle recursively
        const { data: taggedRoles } = await supabase.rpc(
          'get_tagged_roles',
          {
            p_content: responseContent,
            p_thread_id: threadId
          }
        );

        if (taggedRoles?.length) {
          for (const taggedRole of taggedRoles) {
            // Recursive handling of tagged roles
            const taggedContent = `@${role.tag} ${responseContent}`;
            await fetch(req.url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': req.headers.get('Authorization') || '',
              },
              body: JSON.stringify({
                threadId,
                content: taggedContent,
                taggedRoleId: taggedRole.role_id
              })
            });
          }
        }

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