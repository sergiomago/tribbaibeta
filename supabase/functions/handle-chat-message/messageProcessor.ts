import OpenAI from "https://esm.sh/openai@4.26.0";
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Message } from "./types.ts";

export async function processMessage(
  openai: OpenAI,
  supabase: SupabaseClient,
  threadId: string,
  roleId: string,
  userMessage: any,
  previousResponses: Message[]
) {
  console.log('Processing message for role:', roleId);

  // Get role details
  const { data: role } = await supabase
    .from('roles')
    .select('*')
    .eq('id', roleId)
    .single();

  if (!role) throw new Error('Role not found');

  // Get recent memories
  const { data: memories } = await supabase
    .from('role_memories')
    .select('content')
    .eq('role_id', roleId)
    .order('created_at', { ascending: false })
    .limit(5);

  console.log('Retrieved memories:', memories?.length || 0);

  // Store message as memory with simplified metadata
  try {
    await supabase
      .from('role_memories')
      .insert({
        role_id: roleId,
        content: userMessage.content,
        context_type: 'conversation',
        metadata: {
          message_id: userMessage.id,
          thread_id: threadId,
          timestamp: new Date().toISOString(),
          memory_type: 'conversation'
        },
        importance_score: 1.0 // Default importance
      });
  } catch (error) {
    console.error('Error storing memory:', error);
  }

  // Format previous responses for context
  const formattedResponses = previousResponses
    .map(msg => {
      const roleName = msg.role?.name || 'Unknown';
      return `${roleName}: ${msg.content}`;
    })
    .join('\n\n');

  // Create memory context string
  const memoryContext = memories?.length 
    ? `Relevant memories:\n${memories.map(m => m.content).join('\n\n')}`
    : '';

  // Create the system prompt
  const systemPrompt = `You are ${role.name}, an AI role with expertise in: ${role.expertise_areas?.join(', ') || 'general knowledge'}

${memoryContext}

Recent conversation:
${formattedResponses}

Your specific role instructions:
${role.instructions}`;

  // Generate response
  const completion = await openai.chat.completions.create({
    model: role.model || 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage.content }
    ],
  });

  if (!completion.choices || completion.choices.length === 0) {
    console.error('No choices returned from OpenAI chat completion');
    throw new Error('Failed to generate a response from the AI.');
  }

  const responseContent = completion.choices[0].message.content;

  // Store response as memory with simplified metadata
  try {
    await supabase
      .from('role_memories')
      .insert({
        role_id: roleId,
        content: responseContent,
        context_type: 'conversation',
        metadata: {
          is_response: true,
          thread_id: threadId,
          to_message_id: userMessage.id,
          timestamp: new Date().toISOString(),
          memory_type: 'conversation'
        },
        importance_score: 1.0 // Default importance
      });
  } catch (error) {
    console.error('Error storing response memory:', error);
  }

  return responseContent;
}