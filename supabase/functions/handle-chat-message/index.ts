
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

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { threadId, content, roles } = await req.json();
    console.log('Processing message:', { threadId, content, rolesCount: roles.length });

    // Process each role sequentially
    for (const [index, role] of roles.entries()) {
      try {
        // Create initial message placeholder
        const { data: message, error: msgError } = await supabase
          .from('messages')
          .insert({
            thread_id: threadId,
            role_id: role.id,
            content: '...',
            is_bot: true,
            chain_position: index + 1,
            metadata: {
              streaming: true,
              role_name: role.name
            }
          })
          .select()
          .single();

        if (msgError) throw msgError;

        // Get recent context
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

        // Role-specific prompt enhancement
        const rolePrompt = `You are ${role.name}. ${role.instructions}

Your role is to provide expertise and insights based on your specialized knowledge.

Recent conversation:
${context}

Current question/topic:
${content}

Please provide a clear, helpful response focusing on your area of expertise.`;

        // Generate response
        const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: role.model || 'gpt-4o-mini',
            messages: [
              { role: "system", content: rolePrompt },
              { role: "user", content }
            ],
            temperature: 0.7,
            max_tokens: 1000
          })
        });

        const aiData = await aiResponse.json();
        
        if (!aiData.choices?.[0]?.message?.content) {
          throw new Error('No response generated');
        }

        // Update message with response
        const { error: updateError } = await supabase
          .from('messages')
          .update({ 
            content: aiData.choices[0].message.content,
            metadata: {
              role_name: role.name,
              chain_position: index + 1,
              streaming: false
            }
          })
          .eq('id', message.id);

        if (updateError) throw updateError;

      } catch (roleError) {
        console.error(`Error processing role ${role.id}:`, roleError);
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
