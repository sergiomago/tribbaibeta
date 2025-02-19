
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from 'https://esm.sh/openai@4.26.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function getPreviousMessages(supabaseClient: any, threadId: string, currentRoleOrder: number) {
  const { data: messages, error } = await supabaseClient
    .from('messages')
    .select(`
      id,
      content,
      role_id,
      chain_order,
      roles:roles (
        name,
        tag,
        instructions
      )
    `)
    .eq('thread_id', threadId)
    .lt('chain_order', currentRoleOrder)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching previous messages:', error);
    return [];
  }

  return messages || [];
}

function createRolePrompt(role: any, previousMessages: any[], userQuestion: string) {
  const roleType = role.tag?.toLowerCase() || '';
  
  // Basic role characteristics
  const roleCharacteristics = {
    mathematician: {
      perspective: "mathematical",
      focus: "patterns, equations, and logical structures",
      approach: "Break down concepts into mathematical frameworks and provide quantitative insights."
    },
    physicist: {
      perspective: "physical",
      focus: "natural laws, empirical evidence, and experimental results",
      approach: "Explain phenomena through physical principles and real-world applications."
    },
    philosopher: {
      perspective: "philosophical",
      focus: "conceptual analysis, ethics, and metaphysical implications",
      approach: "Examine the deeper meaning and philosophical implications of ideas."
    }
  }[roleType] || {
    perspective: "professional",
    focus: "your area of expertise",
    approach: "Provide insights based on your specific knowledge domain."
  };

  // Create context from previous messages
  const conversationContext = previousMessages
    .map(msg => `${msg.roles.name}: ${msg.content}`)
    .join('\n\n');

  const prompt = `You are ${role.name}, a ${roleCharacteristics.perspective} expert.

CORE INSTRUCTIONS:
${role.instructions || 'Provide expert insights from your field of study.'}

YOUR APPROACH:
1. Focus on ${roleCharacteristics.focus}
2. ${roleCharacteristics.approach}
3. Address the question: "${userQuestion}"

${previousMessages.length > 0 ? `
PREVIOUS RESPONSES IN THIS CONVERSATION:
${conversationContext}

HOW TO BUILD ON PREVIOUS RESPONSES:
1. Acknowledge relevant points made by others
2. Add your unique expertise to expand the discussion
3. Fill gaps in understanding from your perspective
4. Avoid repeating information already covered
5. Make explicit connections to previous insights when relevant
` : 'You are the first to respond. Provide a foundation that others can build upon.'}

Maintain your role's perspective and expertise throughout your response.`;

  return prompt;
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

    console.log('Processing message:', {
      threadId,
      roleName: role.name,
      chainOrder: chain_order
    });

    // Get previous messages in the chain
    const previousMessages = await getPreviousMessages(supabaseClient, threadId, chain_order);
    
    // Generate the role-specific prompt
    const systemPrompt = createRolePrompt(role, previousMessages, content);

    try {
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

      // Update the message with the AI response
      const { error: updateError } = await supabaseClient
        .from('messages')
        .update({
          content: aiResponse,
          metadata: {
            processed: true,
            streaming: false
          }
        })
        .eq('thread_id', threadId)
        .eq('role_id', role.id)
        .eq('chain_order', chain_order);

      if (updateError) {
        throw updateError;
      }

      return new Response(
        JSON.stringify({ success: true }),
        {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 200,
        }
      );

    } catch (error) {
      console.error('Error generating response:', error);
      
      // Update message with error state
      await supabaseClient
        .from('messages')
        .update({
          content: 'Error: Unable to generate response. Please try again.',
          metadata: {
            processed: false,
            streaming: false,
            error: error.message
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
      JSON.stringify({ 
        error: 'Failed to process message',
        details: error.message 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
});
