
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { threadId, content, chain } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log('Processing message:', { threadId, content, chainLength: chain.length });

    // Process each role in the chain sequentially
    for (const { role_id, order } of chain) {
      try {
        // Get role details
        const { data: role, error: roleError } = await supabase
          .from('roles')
          .select('*')
          .eq('id', role_id)
          .single();

        if (roleError) throw roleError;

        // Get recent conversation history
        const { data: messages, error: messagesError } = await supabase
          .from('messages')
          .select('content, role:roles(name), created_at')
          .eq('thread_id', threadId)
          .order('created_at', { ascending: false })
          .limit(5);

        if (messagesError) throw messagesError;

        // Format conversation context
        const conversationContext = messages
          ? messages.reverse().map(msg => `${msg.role?.name || 'User'}: ${msg.content}`).join('\n')
          : '';

        // Prepare AI request
        const aiRequestBody = {
          model: role.model || 'gpt-4o-mini',
          messages: [
            {
              role: "system",
              content: `${role.instructions}\n\nRecent conversation:\n${conversationContext}`
            },
            { role: "user", content }
          ],
          temperature: 0.7,
          max_tokens: 1000
        };

        // Generate AI response
        const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(aiRequestBody)
        });

        const aiData = await aiResponse.json();
        const responseContent = aiData.choices[0].message.content;

        // Store the response
        const { error: messageError } = await supabase
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
          });

        if (messageError) throw messageError;

      } catch (roleError) {
        console.error(`Error processing role ${role_id}:`, roleError);
        throw roleError;
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
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
