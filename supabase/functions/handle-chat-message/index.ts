
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from 'https://esm.sh/openai@4.26.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  threadId: string;
  content: string;
  role: {
    id: string;
    name: string;
    instructions: string;
    model: string;
    expertise_areas?: string[];
    primary_topics?: string[];
  };
  previousResponses?: Array<{
    role: string;
    content: string;
    role_name?: string;
  }>;
  memories?: Array<{
    id: string;
    content: string;
    relevance_score: number;
  }>;
  lastAiResponse?: string;
  messageId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Handling chat message request');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY'),
    });

    const body: RequestBody = await req.json();
    const { threadId, content, role, previousResponses, memories, lastAiResponse, messageId } = body;
    
    if (!threadId || !content || !role || !messageId) {
      console.error('Missing required fields:', { threadId, content, role, messageId });
      throw new Error('Missing required fields');
    }

    try {
      console.log('Processing request for role:', role.name);

      // Build context from previous responses
      const previousResponsesText = previousResponses?.length
        ? `Previous responses:\n${previousResponses.map(msg => 
            `${msg.role_name || 'Unknown'}: ${msg.content}`
          ).join('\n\n')}`
        : '';

      // Build context from memories if available
      const memoriesText = memories?.length
        ? `Relevant memories:\n${memories.map(m => m.content).join('\n\n')}`
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

${memoriesText}

${previousResponsesText}

${lastAiResponse ? `Last AI response: ${lastAiResponse}` : ''}

Remember: Stay true to your expertise and provide unique insights from your field.`;

      console.log('Generating AI response');
      
      // Generate AI response
      const completion = await openai.chat.completions.create({
        model: role.model || 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content }
        ],
        temperature: 0.7,
      });

      const aiResponse = completion.choices[0].message.content;
      console.log('AI response generated successfully');

      // Update message with AI response
      const { error: updateError } = await supabaseClient
        .from('messages')
        .update({
          content: aiResponse,
          metadata: {
            streaming: false,
            processed: true,
            generated_at: new Date().toISOString()
          }
        })
        .eq('id', messageId);

      if (updateError) {
        console.error('Error updating message:', updateError);
        throw updateError;
      }

      return new Response(
        JSON.stringify({ success: true }),
        { 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders 
          } 
        }
      );

    } catch (error) {
      console.error('Error generating response:', error);
      
      // Update message with error state
      await supabaseClient
        .from('messages')
        .update({
          content: 'Failed to generate response. Please try again.',
          metadata: {
            error: error.message || 'Unknown error occurred',
            streaming: false,
            error_timestamp: new Date().toISOString()
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
