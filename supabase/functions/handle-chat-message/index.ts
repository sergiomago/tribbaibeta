
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from 'https://esm.sh/openai@4.26.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function createContextualPrompt(role: any, previousMessages: any[], userQuestion: string) {
  const previousResponsesText = previousMessages
    .map(msg => `${msg.roles?.name || 'Unknown'}: ${msg.content}`)
    .join('\n\n');

  const isFirstResponder = previousMessages.length === 0;

  let contextBuilder = `You are ${role.name}. ${role.instructions || ''}

Your primary goal is to provide insights from your expertise while acknowledging and building upon the perspectives shared by others.

${isFirstResponder ? `
As the first responder:
1. Establish a foundation for others to build upon
2. Share your core perspective on the question
3. Raise points that other experts might want to address
` : `
Previous experts have shared their perspectives:
${previousResponsesText}

Your task:
1. Acknowledge key insights from previous responses that align with or complement your expertise
2. Add your unique perspective, especially where it differs or expands upon previous points
3. Bridge any gaps between your field and the insights already shared
4. Be explicit about how your response connects to or builds upon others' points
`}

Guidelines for your response:
1. Start by briefly acknowledging previous insights (if any)
2. Clearly state your perspective from your field of expertise
3. Make explicit connections to others' points when relevant
4. Add new dimensions to the discussion
5. Keep your tone collaborative and build upon the collective wisdom

Question to address: "${userQuestion}"`;

  return contextBuilder;
}

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

      // Generate AI response with contextual prompt
      const completion = await openai.chat.completions.create({
        model: role.model || 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: createContextualPrompt(role, previousMessages || [], content)
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
