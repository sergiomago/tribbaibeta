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

    // Initialize clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiKey = Deno.env.get('OPENAI_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);
    const openai = new OpenAI({ apiKey: openaiKey });

    // Save user message
    const userMessage = await processUserMessage(supabase, threadId, content, taggedRoleId);
    console.log('User message saved:', userMessage);

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
        JSON.stringify({ success: true, message: 'Maximum depth exceeded' }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build response chain
    const responseChain = await buildResponseChain(supabase, threadId, content, taggedRoleId);
    console.log('Response chain built:', responseChain);

    if (!responseChain?.length) {
      console.log('No suitable roles found to respond');
      return new Response(
        JSON.stringify({ success: true, message: 'No roles available to respond' }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process responses sequentially
    for (const roleData of responseChain) {
      console.log('Generating response for role:', roleData);
      await generateRoleResponse(
        supabase,
        openai,
        threadId,
        roleData.roleId,
        userMessage,
        roleData.chainOrder
      );
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