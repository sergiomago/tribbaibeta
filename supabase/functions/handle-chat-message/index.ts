
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
    .select('content, role:roles(name, tag)')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return messages;
}

function getRoleSpecificInstructions(role: any, previousMessages: any[]) {
  const baseInstructions = `You are ${role.name}. ${role.instructions}`;
  
  const roleSpecificGuidance = {
    mathematician: `Focus on mathematical concepts, formulas, and theoretical frameworks. If others have mentioned concepts, add mathematical depth and precision. Use mathematical terminology but explain it clearly.`,
    
    physicist: `Emphasize physical phenomena, experimental evidence, and practical applications. If others have covered theory, focus on real-world implications and experimental verification. Use physics-specific examples.`,
    
    philosopher: `Examine the conceptual and philosophical implications. If others have explained technical aspects, explore the deeper meaning, paradoxes, and interpretational issues. Consider epistemological and ontological questions.`
  };

  const previousResponsesContext = previousMessages.length > 0 
    ? `\nPrevious responses in this conversation:\n${previousMessages.map(m => 
        `${m.role.name}: ${m.content.substring(0, 200)}...`
      ).join('\n')}`
    : '';

  const complementaryGuidance = `
    Review previous responses and:
    1. Add your unique perspective based on your expertise
    2. Complement rather than repeat what others have said
    3. Make explicit connections to previous points when relevant
    4. Fill gaps in understanding from your field's perspective
    5. If you're the first to respond, provide a foundation for others to build upon
  `;

  return `${baseInstructions}
${roleSpecificGuidance[role.tag.toLowerCase()] || ''}
${previousResponsesContext}
${complementaryGuidance}`;
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

    // Get previous messages for context
    const previousMessages = await getPreviousMessages(supabaseClient, threadId);

    // Process each role's response
    for (const role of roles) {
      try {
        const systemInstructions = getRoleSpecificInstructions(role, previousMessages);
        
        const completion = await openai.chat.completions.create({
          model: role.model || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemInstructions },
            { role: 'user', content }
          ],
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

        if (updateError) throw updateError;

      } catch (error) {
        console.error(`Error processing role ${role.name}:`, error);
        
        await supabaseClient
          .from('messages')
          .update({
            content: `Error: Unable to generate response. Please try again.`,
            metadata: {
              role_name: role.name,
              streaming: false,
              processed: false,
              error: error.message
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

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
});
