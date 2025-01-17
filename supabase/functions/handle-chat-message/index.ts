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
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        thread_id: threadId,
        content,
        tagged_role_id: taggedRoleId || null,
      })
      .select('id, thread_id, content, tagged_role_id')
      .single();

    if (messageError) {
      console.error('Error saving message:', messageError);
      throw messageError;
    }

    // Step 2: Get responding roles
    const { data: threadRoles, error: rolesError } = await supabase
      .from('thread_roles')
      .select('role_id')
      .eq('thread_id', threadId);

    if (rolesError) {
      console.error('Error getting thread roles:', rolesError);
      throw rolesError;
    }

    const roleIds = threadRoles.map(tr => tr.role_id);
    
    // Step 3: Get role details
    const { data: roles, error: roleDetailsError } = await supabase
      .from('roles')
      .select('id, name, instructions, model, tag, special_capabilities')
      .in('id', roleIds);

    if (roleDetailsError) {
      console.error('Error getting role details:', roleDetailsError);
      throw roleDetailsError;
    }

    // Step 4: Process responses for each role
    for (const role of roles) {
      try {
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
            role_id: role.id,
            content: responseContent,
            chain_id: message.id,
          })
          .select('id')
          .single();

        if (responseError) {
          console.error(`Error saving response for role ${role.id}:`, responseError);
          continue;
        }

        // Store memory
        await supabase
          .from('role_memories')
          .insert({
            role_id: role.id,
            content: responseContent,
            context_type: 'conversation',
            metadata: {
              message_id: roleResponse.id,
              thread_id: threadId
            }
          });

      } catch (error) {
        console.error(`Error processing response for role ${role.id}:`, error);
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