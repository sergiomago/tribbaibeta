import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import OpenAI from "https://esm.sh/openai@4.26.0";
import { processUserMessage, generateRoleResponse } from "./messageProcessor.ts";
import { classifyMessage, buildResponseChain } from "./messageClassifier.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { threadId, content, taggedRoleId } = await req.json();
    console.log('Processing message:', { threadId, content, taggedRoleId });

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

    // Save user message
    const userMessage = await processUserMessage(supabase, threadId, content, taggedRoleId);
    console.log('User message saved:', userMessage);

    // Determine message type and build response chain
    const messageType = classifyMessage(content);
    console.log('Message classified as:', messageType);

    const responseChain = await buildResponseChain(supabase, threadId, content, messageType);
    console.log('Response chain built:', responseChain);

    if (!responseChain?.length) {
      return new Response(
        JSON.stringify({
          error: 'No roles available',
          message: 'No roles available to respond'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Generate responses sequentially
    const responses = [];
    for (const { roleId, order } of responseChain) {
      try {
        console.log(`Generating response for role ${roleId} (order: ${order})`);
        const response = await generateRoleResponse(
          supabase,
          openai,
          threadId,
          roleId,
          userMessage,
          order,
          responses
        );
        responses.push(response);
      } catch (error) {
        console.error(`Error generating response for role ${roleId}:`, error);
        responses.push({
          roleId,
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