
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from 'https://esm.sh/openai@4.26.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function getPreviousMessages(supabaseClient: any, threadId: string, limit: number = 5) {
  const { data: messages, error } = await supabaseClient
    .from('messages')
    .select('content, role:roles(name, tag, instructions)')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return messages;
}

function getRoleSpecificInstructions(role: any, previousMessages: any[]) {
  // Default instructions if role-specific ones aren't available
  const baseInstructions = `You are ${role.name}. Your goal is to provide insights from your unique perspective while building upon previous responses.`;
  
  const roleSpecificGuidance = {
    mathematician: 'Approach the question from a mathematical perspective. Focus on patterns, logic, and quantitative aspects.',
    physicist: 'Analyze the question through the lens of physical laws and empirical observation.',
    philosopher: 'Examine the deeper implications and conceptual foundations of the question.'
  };

  const previousResponsesContext = previousMessages.length > 0 
    ? `\nPrevious responses:\n${previousMessages.map(m => 
        `${m.role?.name || 'Unknown'}: ${m.content?.substring(0, 200) || ''}...`
      ).join('\n')}`
    : '';

  return `${baseInstructions}
${roleSpecificGuidance[role.tag?.toLowerCase()] || ''}
${previousResponsesContext}
Key guidelines:
1. Provide unique insights from your expertise
2. Build upon previous responses without repeating them
3. Make specific references to points made by others when relevant
4. Stay true to your role's perspective
5. If you're first, provide a foundation for others`;
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

    const { threadId, content, roles } = await req.json();

    if (!threadId || !content || !roles) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    console.log('Processing message for thread:', threadId);

    try {
      const previousMessages = await getPreviousMessages(supabaseClient, threadId);

      for (const role of roles) {
        try {
          console.log(`Processing role: ${role.name}`);
          
          const systemInstructions = getRoleSpecificInstructions(role, previousMessages);
          
          const completion = await openai.chat.completions.create({
            model: role.model || 'gpt-4o-mini',
            messages: [
              { role: 'system', content: systemInstructions },
              { role: 'user', content }
            ],
            temperature: 0.7,
          });

          const aiResponse = completion.choices[0].message.content;

          const { error: updateError } = await supabaseClient
            .from('messages')
            .update({
              content: aiResponse,
              metadata: {
                role_name: role.name,
                streaming: false,
                processed: true
              }
            })
            .eq('thread_id', threadId)
            .eq('role_id', role.id)
            .eq('metadata->streaming', true);

          if (updateError) {
            console.error('Error updating message:', updateError);
            throw updateError;
          }

        } catch (roleError) {
          console.error(`Error processing role ${role.name}:`, roleError);
          
          await supabaseClient
            .from('messages')
            .update({
              content: `Error: Unable to generate response. Please try again.`,
              metadata: {
                role_name: role.name,
                streaming: false,
                processed: false,
                error: roleError.message
              }
            })
            .eq('thread_id', threadId)
            .eq('role_id', role.id)
            .eq('metadata->streaming', true);
        }
      }

      return new Response(
        JSON.stringify({ success: true }),
        {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 200,
        }
      );

    } catch (dbError) {
      console.error('Database error:', dbError);
      throw dbError;
    }

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'An error occurred while processing the request',
        details: error.message 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
});
