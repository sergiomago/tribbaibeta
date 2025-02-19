
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from 'https://esm.sh/openai@4.26.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY'),
    });

    const { threadId, content, role, chain_order } = await req.json();
    
    if (!threadId || !content || !role || !chain_order) {
      throw new Error('Missing required fields');
    }

    console.log('Processing message:', { role: role.name, chainOrder: chain_order });

    try {
      // Get previous messages for context
      const { data: previousMessages } = await supabaseClient
        .from('messages')
        .select('content, roles(name)')
        .eq('thread_id', threadId)
        .lt('chain_order', chain_order)
        .order('chain_order', { ascending: true });

      // Generate AI response
      const completion = await openai.chat.completions.create({
        model: role.model || 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: `You are ${role.name}. ${role.instructions || ''}

Previous responses in this conversation:
${previousMessages?.map(m => `${m.roles?.name || 'Unknown'}: ${m.content}`).join('\n\n') || 'You are the first to respond.'}

Key guidelines:
1. Stay true to your role's expertise and perspective
2. Build upon previous responses without repeating information
3. Make connections to points raised by others when relevant
4. Provide unique insights from your field
5. If you're first, establish a foundation for others to build upon`
          },
          { role: 'user', content }
        ],
        temperature: 0.7,
      });

      const aiResponse = completion.choices[0].message.content;

      // Update message with AI response
      const { error: updateError } = await supabaseClient
        .from('messages')
        .update({
          content: aiResponse,
          metadata: {
            streaming: false,
            processed: true
          }
        })
        .eq('thread_id', threadId)
        .eq('role_id', role.id)
        .eq('chain_order', chain_order);

      if (updateError) throw updateError;

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );

    } catch (error) {
      console.error('Error generating response:', error);
      // Update message to show error
      await supabaseClient
        .from('messages')
        .update({
          content: 'Failed to generate response. Please try again.',
          metadata: {
            error: error.message,
            streaming: false
          }
        })
        .eq('thread_id', threadId)
        .eq('role_id', role.id)
        .eq('chain_order', chain_order);

      throw error;
    }

  } catch (error) {
    console.error('Error in edge function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
});
