
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

  // Get conversation history with depth levels
  const { data: conversationHistory } = await supabase
    .from('messages')
    .select(`
      id,
      content,
      role:roles(name, expertise_areas),
      depth_level,
      response_to_id,
      conversation_context
    `)
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true });

  // Get relevant memories
  const { data: memories } = await supabase
    .from('role_memories')
    .select('content, context_type, metadata')
    .eq('role_id', roleId)
    .order('created_at', { ascending: false })
    .limit(5);

  // Format conversation history as a flowing dialogue
  const formattedHistory = conversationHistory?.map(msg => {
    const roleName = msg.role?.name || 'User';
    const expertise = msg.role?.expertise_areas?.join(', ');
    return `${roleName}${expertise ? ` (expert in ${expertise})` : ''}: ${msg.content}`;
  }).join('\n\n');

  // Create memory context
  const memoryContext = memories?.map(memory => {
    const contextType = memory.context_type === 'conversation' ? 'From a previous conversation' : 'From my knowledge base';
    return `${contextType}: ${memory.content}`;
  }).join('\n\n');

  // Build the system prompt with natural conversation flow
  const systemPrompt = `You are ${role.name}, engaging in a natural conversation.

Your expertise areas: ${role.expertise_areas?.join(', ')}

Conversation history:
${formattedHistory}

Relevant context from previous interactions:
${memoryContext}

Important guidelines:
1. Maintain a natural, flowing conversation
2. Build upon previous points made by others
3. Reference relevant past discussions when appropriate
4. Stay within your expertise while acknowledging others' contributions
5. Keep responses focused and relevant to the current discussion
6. Be clear and conversational in tone

Your role instructions:
${role.instructions}

Current context:
${userMessage.content}`;

  console.log('Generated system prompt with natural conversation flow');

  // Generate response
  const completion = await openai.chat.completions.create({
    model: role.model || 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage.content }
    ],
  });

  const responseContent = completion.choices[0].message.content;

  // Save response with proper conversation context
  const { data: savedResponse, error: responseError } = await supabase
    .from('messages')
    .insert({
      thread_id: threadId,
      role_id: roleId,
      content: responseContent,
      response_to_id: userMessage.id,
      conversation_context: {
        previous_message: userMessage.id,
        context_depth: await getDepthLevel(supabase, userMessage.id),
        referenced_memories: memories?.map(m => m.metadata?.message_id).filter(Boolean)
      }
    })
    .select()
    .single();

  if (responseError) throw responseError;

  // Store the interaction as a memory
  try {
    await supabase
      .from('role_memories')
      .insert({
        role_id: roleId,
        content: responseContent,
        context_type: 'conversation',
        metadata: {
          thread_id: threadId,
          response_to_message: userMessage.id,
          conversation_depth: savedResponse.depth_level,
          memory_type: 'conversation'
        }
      });
  } catch (error) {
    console.error('Error storing memory:', error);
  }

  return responseContent;
}

async function getDepthLevel(supabase: SupabaseClient, messageId: string): Promise<number> {
  const { data } = await supabase.rpc('get_conversation_depth', { message_id: messageId });
  return data || 1;
}
