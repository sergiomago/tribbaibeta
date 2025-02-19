
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

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { threadId, content, roles } = await req.json();
    console.log('Processing message:', { threadId, rolesCount: roles?.length });

    // Get existing placeholder messages
    const { data: placeholders } = await supabase
      .from('messages')
      .select('*')
      .eq('thread_id', threadId)
      .eq('is_bot', true)
      .eq('content', '...')
      .order('chain_position', { ascending: true });

    if (!placeholders?.length) {
      throw new Error('No placeholder messages found');
    }

    // Process each role sequentially
    for (const [index, placeholder] of placeholders.entries()) {
      try {
        const role = roles[index];
        
        // Get conversation context
        const { data: history } = await supabase
          .from('messages')
          .select('content, role:roles(name)')
          .eq('thread_id', threadId)
          .order('created_at', { ascending: false })
          .limit(5);

        const context = history
          ? history.reverse().map(msg => 
              `${msg.role?.name || 'User'}: ${msg.content}`
            ).join('\n')
          : '';

        // Generate response
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
                content: `You are ${role.name}. ${role.instructions}\n\nRecent conversation:\n${context}`
              },
              { role: "user", content }
            ]
          })
        });

        const aiData = await response.json();
        console.log('AI Response:', aiData);

        if (!aiData.choices?.[0]?.message?.content) {
          throw new Error('No response generated');
        }

        // Update placeholder with response
        const { error: updateError } = await supabase
          .from('messages')
          .update({
            content: aiData.choices[0].message.content,
            metadata: {
              ...placeholder.metadata,
              streaming: false
            }
          })
          .eq('id', placeholder.id);

        if (updateError) throw updateError;
        
      } catch (roleError) {
        console.error(`Error processing role ${index}:`, roleError);
        
        // Update placeholder to show error
        await supabase
          .from('messages')
          .update({
            content: 'Failed to generate response.',
            metadata: {
              ...placeholder.metadata,
              streaming: false,
              error: true
            }
          })
          .eq('id', placeholder.id);
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
