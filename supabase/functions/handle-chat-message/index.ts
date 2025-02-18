
import { serve } from "https://deno.fresh.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { processMessage } from "./messageProcessor.ts";
import { MessageProcessor } from "./types.ts";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Safely parse the request body
    const requestData = await req.json();
    const { threadId, content, messageId, taggedRoleId } = requestData;

    if (!threadId || !content) {
      throw new Error("Missing required fields: threadId and content are required");
    }

    console.log("Processing message:", { threadId, content, messageId, taggedRoleId });

    // Create message processor instance
    const messageProcessor: MessageProcessor = {
      supabase: supabaseClient,
      threadId,
      content,
      messageId,
      taggedRoleId
    };

    // Process the message
    const result = await processMessage(messageProcessor);

    return new Response(
      JSON.stringify(result),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 200,
      },
    );

  } catch (error) {
    console.error("Error processing message:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.toString()
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 500,
      },
    );
  }
});
