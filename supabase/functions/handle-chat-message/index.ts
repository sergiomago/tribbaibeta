
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Configuration, OpenAIApi } from "https://esm.sh/openai@4.26.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY')!;

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const openai = new OpenAIApi(new Configuration({ apiKey: openAIApiKey }));

  try {
    const { threadId, content, chain } = await req.json();
    console.log('Processing message:', { threadId, content, chainLength: chain.length });

    let previousResponses = [];

    // Process each role in the chain sequentially
    for (const { role_id, order } of chain) {
      console.log(`Processing role ${role_id} at position ${order}`);

      // Get role details
      const { data: role, error: roleError } = await supabase
        .from('roles')
        .select('*')
        .eq('id', role_id)
        .single();

      if (roleError) {
        console.error('Error fetching role:', roleError);
        throw roleError;
      }

      // Get conversation context including previous responses in this chain
      const { data: contextMessages, error: contextError } = await supabase
        .from('messages')
        .select(`
          content,
          role_id,
          role:roles(name),
          created_at
        `)
        .eq('thread_id', threadId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (contextError) {
        console.error('Error fetching context:', contextError);
        throw contextError;
      }

      // Format conversation history including previous responses
      const conversationHistory = [
        ...contextMessages.reverse().map(msg => ({
          role: msg.role_id === role_id ? "assistant" : "user",
          content: msg.content,
          name: msg.role?.name
        })),
        ...previousResponses.map(resp => ({
          role: "assistant",
          content: resp.content,
          name: resp.role_name
        }))
      ];

      // Prepare the system message with role instructions and context
      let systemMessage = role.instructions;
      
      if (previousResponses.length > 0) {
        systemMessage += "\n\nPrevious responses in this chain:\n" + 
          previousResponses.map(resp => 
            `${resp.role_name}: ${resp.content}`
          ).join("\n");
      }

      // Generate AI response
      const completion = await openai.createChatCompletion({
        model: role.model || 'gpt-4o-mini',
        messages: [
          { role: "system", content: systemMessage },
          ...conversationHistory.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          { role: "user", content }
        ],
      });

      const responseContent = completion.data.choices[0].message?.content;
      if (!responseContent) {
        throw new Error('No response generated');
      }

      // Store the response
      const { data: storedMessage, error: messageError } = await supabase
        .from('messages')
        .insert({
          thread_id: threadId,
          content: responseContent,
          role_id: role_id,
          is_bot: true,
          chain_position: order,
          metadata: {
            context_type: 'response',
            role_name: role.name,
            chain_order: order
          }
        })
        .select()
        .single();

      if (messageError) {
        console.error('Error storing message:', messageError);
        throw messageError;
      }

      // Add this response to the chain for next role to consider
      previousResponses.push({
        content: responseContent,
        role_name: role.name,
        role_id: role_id
      });

      // Record the interaction
      const { error: interactionError } = await supabase
        .from('role_interactions')
        .insert({
          thread_id: threadId,
          initiator_role_id: role_id,
          responder_role_id: role_id,
          interaction_type: 'chain_response',
          metadata: {
            chain_position: order,
            previous_responses: previousResponses.length - 1
          }
        });

      if (interactionError) {
        console.error('Error recording interaction:', interactionError);
        throw interactionError;
      }
    }

    return new Response(
      JSON.stringify({ success: true, responses: previousResponses.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in handle-chat-message:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
