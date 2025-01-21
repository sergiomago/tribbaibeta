import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import OpenAI from "https://esm.sh/openai@4.26.0";
import { processUserMessage, generateRoleResponse } from "./messageProcessor.ts";
import { buildResponseChain } from "./responseChain.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { threadId, content, taggedRoleId } = await req.json();
    console.log('Processing message:', { threadId, content, taggedRoleId });

    // Validate required parameters
    if (!threadId || !content) {
      return new Response(
        JSON.stringify({
          error: 'Missing parameters',
          message: 'threadId and content are required'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Initialize clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiKey = Deno.env.get('OPENAI_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);
    const openai = new OpenAI({ apiKey: openaiKey });

    // Verify thread exists and has roles
    const { data: thread, error: threadError } = await supabase
      .from('threads')
      .select('id')
      .eq('id', threadId)
      .single();

    if (threadError || !thread) {
      console.error('Thread verification failed:', threadError);
      return new Response(
        JSON.stringify({
          error: 'Invalid thread',
          message: 'Thread not found'
        }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { data: threadRoles, error: threadRolesError } = await supabase
      .from('thread_roles')
      .select('role_id')
      .eq('thread_id', threadId);

    if (threadRolesError) {
      console.error('Error fetching thread roles:', threadRolesError);
      return new Response(
        JSON.stringify({
          error: 'Database error',
          message: 'Failed to fetch thread roles'
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!threadRoles?.length) {
      return new Response(
        JSON.stringify({
          error: 'No roles assigned',
          message: 'Please add at least one role to the chat before sending messages'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Save user message
    let userMessage;
    try {
      userMessage = await processUserMessage(supabase, threadId, content, taggedRoleId);
      console.log('User message saved:', userMessage);
    } catch (error) {
      console.error('Error processing user message:', error);
      return new Response(
        JSON.stringify({
          error: 'Message processing failed',
          message: error.message
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get chain depth to prevent infinite recursion
    const { data: chainDepth } = await supabase.rpc(
      'get_chain_depth',
      { 
        p_thread_id: threadId,
        p_chain_id: userMessage.id
      }
    );

    if (chainDepth > 3) {
      console.log('Maximum recursion depth exceeded');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Maximum conversation depth reached' 
        }), 
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Build response chain with improved error handling
    let responseChain;
    try {
      responseChain = await buildResponseChain(supabase, threadId, content, taggedRoleId);
      console.log('Response chain built:', responseChain);

      if (!responseChain?.length) {
        return new Response(
          JSON.stringify({
            error: 'No suitable roles',
            message: 'No roles available to respond to this message'
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    } catch (error) {
      console.error('Error building response chain:', error);
      return new Response(
        JSON.stringify({
          error: 'Chain building failed',
          message: error.message
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Process responses sequentially with improved error handling
    const responses = [];
    for (const roleData of responseChain) {
      try {
        console.log('Generating response for role:', roleData);
        const response = await generateRoleResponse(
          supabase,
          openai,
          threadId,
          roleData.roleId,
          userMessage,
          roleData.chainOrder
        );
        responses.push(response);
      } catch (error) {
        console.error('Error generating role response:', error);
        // Log error but continue with other roles
        responses.push({
          roleId: roleData.roleId,
          error: error.message
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        responses 
      }), 
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
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