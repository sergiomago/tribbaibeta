
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

    const { threadId, content, role, chain_order, messageId } = await req.json();
    
    if (!threadId || !content || !role || !chain_order || !messageId) {
      throw new Error('Missing required fields');
    }

    try {
      // Get previous messages for context
      const { data: previousMessages } = await supabaseClient
        .from('messages')
        .select('content, roles(name)')
        .eq('thread_id', threadId)
        .lt('chain_order', chain_order)
        .order('chain_order', { ascending: true });

      const previousResponsesText = previousMessages?.length
        ? `Previous responses:\n${previousMessages.map(msg => 
            `${msg.roles?.name || 'Unknown'}: ${msg.content}`
          ).join('\n\n')}`
        : '';

      const expertiseAreas = role.expertise_areas?.join(', ') || 'your field';
      const primaryTopics = role.primary_topics?.join(', ') || 'relevant topics';

      const systemPrompt = `You are ${role.name}, an expert in ${expertiseAreas}. 
${role.instructions || ''}

Your expertise covers: ${primaryTopics}

Key instructions:
1. ALWAYS answer from your specific expertise perspective
2. Use terminology and concepts from your field
3. If the question isn't in your expertise, acknowledge this but provide relevant insights from your field
4. Be precise and technical when appropriate

${previousResponsesText}

Remember: Stay true to your expertise and provide unique insights from your field.`;

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
        .eq('id', messageId);

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
        .eq('id', messageId);

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
