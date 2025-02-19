
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY')!;

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { threadId, content, chain } = await req.json();
    console.log('Processing message:', { threadId, chainLength: chain.length });

    // Process each role sequentially
    for (const { role_id, order } of chain) {
      // Get role details
      const { data: role, error: roleError } = await supabase
        .from('roles')
        .select('*')
        .eq('id', role_id)
        .single();

      if (roleError) throw roleError;

      // Get recent messages for context
      const { data: messages } = await supabase
        .from('messages')
        .select('content, role:roles(name)')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: false })
        .limit(5);

      // Format conversation context
      const context = messages
        ? messages.reverse().map(msg => 
            `${msg.role?.name || 'User'}: ${msg.content}`
          ).join('\n')
        : '';

      // Generate AI response
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: role.model || 'gpt-4o-mini',
          messages: [
            {
              role: "system",
              content: `${role.instructions}\n\nRecent conversation:\n${context}`
            },
            { role: "user", content }
          ]
        })
      });

      const aiData = await response.json();
      
      if (!aiData.choices?.[0]?.message?.content) {
        throw new Error('No response generated');
      }

      // Store the response
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          thread_id: threadId,
          content: aiData.choices[0].message.content,
          role_id: role_id,
          is_bot: true,
          chain_position: order,
          metadata: {
            role_name: role.name,
            chain_order: order
          }
        });

      if (messageError) throw messageError;
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
