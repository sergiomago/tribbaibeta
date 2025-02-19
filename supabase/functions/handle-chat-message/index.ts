
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
    console.log('Processing request:', { threadId, role: role.name, chain_order });
    
    if (!threadId || !content || !role || !chain_order) {
      throw new Error('Missing required fields');
    }

    try {
      // Get previous messages for context
      const { data: previousMessages, error: prevMsgError } = await supabaseClient
        .from('messages')
        .select('content, roles(name)')
        .eq('thread_id', threadId)
        .lt('chain_order', chain_order)
        .order('chain_order', { ascending: true });

      if (prevMsgError) throw prevMsgError;

      console.log('Previous messages:', previousMessages?.length || 0);

      // Prepare prompt based on role position
      const isFirstResponder = !previousMessages?.length;
      const systemPrompt = `You are ${role.name}. ${role.instructions || ''}

${isFirstResponder ? `
As the first responder:
1. Share your core expertise on the question
2. Raise points that other experts might want to address
3. Set a foundation for a collaborative discussion
` : `
Previous responses:
${previousMessages?.map(msg => `${msg.roles?.name || 'Unknown'}: ${msg.content}`).join('\n\n')}

Your task:
1. Acknowledge relevant insights from previous responses
2. Add your unique perspective from your field
3. Make connections to others' points when relevant
4. Fill any gaps in the discussion
`}

Remember to:
- Stay focused on your area of expertise
- Be clear and concise
- Build upon others' insights
- Add value to the discussion`;

      // Generate AI response
      const completion = await openai.chat.completions.create({
        model: role.model || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content }
        ],
        temperature: 0.7,
      });

      const aiResponse = completion.choices[0].message.content;
      console.log('Generated response for:', role.name);

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
