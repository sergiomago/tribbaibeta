
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { Configuration, OpenAIApi } from "https://esm.sh/openai@4.26.0";
import { getRoleChain } from "./responseChainManager.ts";
import { MessageProcessor } from "./types.ts";

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

    // Get role chain
    const chain = await getRoleChain(supabaseClient, threadId, taggedRoleId);
    console.log("Role chain:", chain);

    // Process message through chain
    const responses = await Promise.all(
      chain.map(async (member) => {
        const { data: role } = await supabaseClient
          .from('roles')
          .select('*')
          .eq('id', member.role_id)
          .single();

        if (!role) {
          throw new Error(`Role ${member.role_id} not found`);
        }

        // Generate response using OpenAI
        const response = await openai.createChatCompletion({
          model: role.model || "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: role.instructions
            },
            {
              role: "user",
              content
            }
          ],
        });

        // Store response in messages table
        const { error: messageError } = await supabaseClient
          .from('messages')
          .insert({
            thread_id: threadId,
            content: response.data.choices[0].message?.content,
            role_id: member.role_id,
            is_bot: true,
            response_to_id: messageId,
            response_order: member.order
          });

        if (messageError) throw messageError;

        return {
          role_id: member.role_id,
          content: response.data.choices[0].message?.content
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
