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

  // Get relevant memories (simple retrieval)
  const { data: memories } = await supabase.rpc(
    'get_similar_memories',
    {
      p_embedding: userMessage.content,
      p_match_threshold: 0.7,
      p_match_count: 5,
      p_role_id: roleId
    }
  );

  console.log('Retrieved relevant memories:', memories?.length || 0);

  // Store message as memory
  try {
    await storeMessageMemory(supabase, roleId, threadId, userMessage);
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

  const responseContent = completion.choices[0].message.content;

  // Store response as memory
  try {
    await storeMessageMemory(supabase, roleId, threadId, {
      content: responseContent,
      metadata: {
        is_response: true,
        to_message_id: userMessage.id
      }
    });
  } catch (error) {
    console.error('Error storing response memory:', error);
  }

  return responseContent;
}

async function storeMessageMemory(
  supabase: SupabaseClient,
  roleId: string,
  threadId: string,
  message: any
) {
  const metadata = {
    thread_id: threadId,
    message_id: message.id,
    timestamp: new Date().toISOString(),
    memory_type: 'conversation',
    is_response: message.metadata?.is_response || false,
    to_message_id: message.metadata?.to_message_id
  };

  await supabase
    .from('role_memories')
    .insert({
      role_id: roleId,
      content: message.content,
      context_type: 'conversation',
      metadata
    });
}