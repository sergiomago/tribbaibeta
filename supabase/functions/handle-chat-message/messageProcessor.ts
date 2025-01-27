import OpenAI from "https://esm.sh/openai@4.26.0";
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Message } from "./types.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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

  // Get role's mind
  const { data: mindData } = await supabase
    .from('role_minds')
    .select('*')
    .eq('role_id', roleId)
    .eq('status', 'active')
    .maybeSingle();

  // Get relevant memories for context
  const relevantMemories = await getRelevantMemories(supabase, roleId, userMessage.content);
  console.log('Retrieved relevant memories:', relevantMemories?.length || 0);

  // Store message as memory
  try {
    await storeMessageMemory(supabase, roleId, threadId, userMessage);
  } catch (error) {
    console.error('Error storing memory:', error);
    // Continue processing even if memory storage fails
  }

  // Format previous responses for context
  const formattedResponses = previousResponses
    .map(msg => {
      const roleName = msg.role?.name || 'Unknown';
      return `${roleName}: ${msg.content}`;
    })
    .join('\n\n');

  // Create memory context string
  const memoryContext = relevantMemories?.length 
    ? `Relevant memories:\n${relevantMemories.map(m => m.content).join('\n\n')}`
    : '';

  // Create the enhanced system prompt
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

async function getRelevantMemories(supabase: SupabaseClient, roleId: string, content: string) {
  try {
    const { data: memories } = await supabase
      .from('role_memories')
      .select('content, metadata, importance_score')
      .eq('role_id', roleId)
      .order('importance_score', { ascending: false })
      .limit(5);

    return memories;
  } catch (error) {
    console.error('Error retrieving memories:', error);
    return [];
  }
}

async function storeMessageMemory(
  supabase: SupabaseClient,
  roleId: string,
  threadId: string,
  message: any
) {
  await supabase
    .from('role_memories')
    .insert({
      role_id: roleId,
      content: message.content,
      context_type: 'conversation',
      metadata: {
        thread_id: threadId,
        message_id: message.id,
        timestamp: new Date().toISOString(),
        memory_type: 'conversation',
        importance_score: 1.0,
        conversation_context: {
          is_response: message.metadata?.is_response || false,
          to_message_id: message.metadata?.to_message_id
        }
      }
    });
}