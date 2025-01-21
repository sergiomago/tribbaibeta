import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import OpenAI from "https://esm.sh/openai@4.26.0";
import { processUserMessage } from "./messageProcessor.ts";
import { buildResponseChain } from "./responseChainManager.ts";

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

    // Build response chain
    const responseChain = await buildResponseChain(supabase, threadId, content, taggedRoleId);
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

    // Generate responses for each role in the chain
    const responses = [];
    for (const { roleId, chainOrder } of responseChain) {
      try {
        console.log(`Generating response for role ${roleId} (order: ${chainOrder})`);
        
        // Get role details
        const { data: role } = await supabase
          .from('roles')
          .select('*')
          .eq('id', roleId)
          .single();

        if (!role) {
          console.error(`Role ${roleId} not found`);
          continue;
        }

        // Build context from previous responses
        const contextMessages = responses.map(r => `${r.role?.name}: ${r.content}`).join('\n');
        const systemPrompt = role.instructions + (contextMessages ? `\n\nPrevious responses:\n${contextMessages}` : '');

        // Generate response using OpenAI
        const completion = await openai.chat.completions.create({
          model: role.model || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content }
          ],
        });

        const responseContent = completion.choices[0].message.content;
        console.log(`Generated response for ${role.name}:`, responseContent);

        // Save response
        const { data: savedMessage, error: saveError } = await supabase
          .from('messages')
          .insert({
            thread_id: threadId,
            role_id: roleId,
            content: responseContent,
            chain_id: userMessage.id,
            chain_order: chainOrder,
            message_type: 'text'
          })
          .select(`
            *,
            role:roles(name, tag)
          `)
          .single();

        if (saveError) throw saveError;
        responses.push(savedMessage);

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