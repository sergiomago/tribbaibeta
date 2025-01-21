import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import OpenAI from "https://esm.sh/openai@4.26.0";
import { processUserMessage, generateRoleResponse } from "./messageProcessor.ts";

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

    // Initialize clients
    const supabase = createClient(supabaseUrl, supabaseKey);
    const openai = new OpenAI({ apiKey: openaiKey });

    const { threadId, content, taggedRoleId } = await req.json();
    console.log('Processing message:', { threadId, content, taggedRoleId });

    // Save user message
    const userMessage = await processUserMessage(supabase, threadId, content, taggedRoleId);

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
      respondingRoles = [{
        roleId: taggedRoleId,
        chainOrder: 1
      }];
    } else {
      const { data: roles } = await supabase.rpc(
        'get_best_responding_role',
        { 
          p_thread_id: threadId,
          p_context: content,
          p_threshold: 0.3,
          p_max_roles: 3
        }
      );
      respondingRoles = roles?.map(r => ({
        roleId: r.role_id,
        chainOrder: r.chain_order
      }));
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
      const response = await generateRoleResponse(
        supabase,
        openai,
        threadId,
        roleData.roleId,
        userMessage,
        roleData.chainOrder
      );

      if (response) {
        // Check for tagged roles in response
        const { data: taggedRoles } = await supabase.rpc(
          'get_tagged_roles',
          {
            p_content: response.content,
            p_thread_id: threadId
          }
        );

        if (taggedRoles?.length) {
          for (const taggedRole of taggedRoles) {
            const taggedContent = `@${roleData.roleId} ${response.content}`;
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