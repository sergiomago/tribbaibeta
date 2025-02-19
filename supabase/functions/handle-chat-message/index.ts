
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { Configuration, OpenAIApi } from "https://esm.sh/openai@4.26.0";
import { selectResponders } from "./roleSelector.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Initialize OpenAI
    const configuration = new Configuration({
      apiKey: Deno.env.get('OPENAI_API_KEY'),
    });
    const openai = new OpenAIApi(configuration);

    // Parse request
    const { threadId, content, messageId, taggedRoleId } = await req.json();

    if (!threadId || !content) {
      throw new Error("Missing required fields: threadId and content are required");
    }

    console.log("Processing message:", { threadId, content, messageId, taggedRoleId });

    // Get relevant roles using the new selector
    const roles = await selectResponders(supabaseClient, content, threadId, taggedRoleId);
    console.log("Selected roles:", roles);

    if (!roles.length) {
      throw new Error("No suitable roles found to respond");
    }

    // Get thread context (last 5 messages)
    const { data: threadContext } = await supabaseClient
      .from('messages')
      .select('content, role_id, is_bot')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: false })
      .limit(5);

    console.log("Thread context:", threadContext);

    // Process message through selected roles
    const responses = await Promise.all(
      roles.map(async (role, index) => {
        // Build context-aware prompt
        const contextMessages = threadContext?.map(msg => ({
          role: msg.is_bot ? "assistant" : "user",
          content: msg.content
        })) || [];

        // Generate response using OpenAI
        const response = await openai.createChatCompletion({
          model: role.model || "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: role.instructions
            },
            ...contextMessages,
            {
              role: "user",
              content
            }
          ],
        });

        const responseContent = response.data.choices[0].message?.content;

        // Store response in messages table
        const { error: messageError } = await supabaseClient
          .from('messages')
          .insert({
            thread_id: threadId,
            content: responseContent,
            role_id: role.id,
            is_bot: true,
            response_to_id: messageId,
            response_order: index + 1,
            memory_context: {
              context_messages: threadContext,
              response_confidence: response.data.choices[0].finish_reason === 'stop' ? 1 : 0.5
            }
          });

        if (messageError) throw messageError;

        return {
          role_id: role.id,
          content: responseContent,
          role_name: role.name
        };
      })
    );

    return new Response(
      JSON.stringify({ success: true, data: responses }),
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
        success: false,
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
