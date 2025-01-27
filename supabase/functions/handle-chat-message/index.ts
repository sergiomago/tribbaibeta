import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import OpenAI from "https://esm.sh/openai@4.26.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  try {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);
    const openai = new OpenAI({ apiKey: openAIApiKey });
    
    const { threadId, content, taggedRoleId } = await req.json();
    console.log('Processing message:', { threadId, content, taggedRoleId });

    if (!threadId || !content) {
      throw new Error('Missing required fields: threadId and content are required');
    }

    // Save user message
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
      console.error('Error saving user message:', messageError);
      throw messageError;
    }

    console.log('User message saved:', message);

    // Get conversation chain using our new simplified function
    const { data: chain, error: chainError } = await supabase
      .rpc('get_simple_conversation_chain', { 
        p_thread_id: threadId
      });

    if (chainError) {
      console.error('Error getting conversation chain:', chainError);
      throw chainError;
    }

    if (!chain || chain.length === 0) {
      console.log('No roles found in chain');
      return new Response(
        JSON.stringify({ success: true, message: 'No roles to respond' }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing chain:', chain);

    // Process responses for each role in chain
    for (const { role_id, chain_order } of chain) {
      try {
        // Get role details
        const { data: role, error: roleError } = await supabase
          .from('roles')
          .select('*')
          .eq('id', role_id)
          .maybeSingle();

        if (roleError) {
          console.error(`Error fetching role ${role_id}:`, roleError);
          continue;
        }

        if (!role) {
          console.error(`Role ${role_id} not found`);
          continue;
        }

        // Get recent conversation history
        const { data: history, error: historyError } = await supabase
          .from('messages')
          .select('content, role_id, roles(name)')
          .eq('thread_id', threadId)
          .order('created_at', { ascending: false })
          .limit(5);

        if (historyError) {
          console.error('Error fetching conversation history:', historyError);
          continue;
        }

        const conversationContext = history 
          ? history.reverse()
              .map(msg => `${msg.roles?.name || 'User'}: ${msg.content}`)
              .join('\n\n')
          : '';

        console.log(`Generating response for role ${role.name}`);

        // Generate response using OpenAI
        const completion = await openai.chat.completions.create({
          model: role.model || 'gpt-4-turbo-preview',
          messages: [
            { 
              role: 'system', 
              content: `You are ${role.name}, ${role.description || 'an AI assistant'}.\n\n${role.instructions}` 
            },
            { 
              role: 'system', 
              content: `Recent conversation:\n${conversationContext}` 
            },
            { role: 'user', content }
          ],
        });

        const responseContent = completion.choices[0].message.content;
        if (!responseContent) {
          console.error('No response generated from OpenAI');
          continue;
        }

        console.log(`Saving response for role ${role.name}`);

        // Save role's response
        const { error: responseError } = await supabase
          .from('messages')
          .insert({
            thread_id: threadId,
            role_id: role_id,
            content: responseContent,
            chain_id: message.id,
            chain_order: chain_order || 1 // Provide safe default
          });

        if (responseError) {
          console.error(`Error saving response for role ${role_id}:`, responseError);
          continue;
        }

      } catch (error) {
        console.error(`Error processing response for role ${role_id}:`, error);
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