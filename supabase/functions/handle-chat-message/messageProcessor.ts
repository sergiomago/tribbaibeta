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

  if (!mindData?.mind_id) {
    console.log('No active mind found for role:', roleId);
  } else {
    console.log('Found active mind:', mindData.mind_id);
    
    try {
      // Store message as memory
      await supabase
        .from('role_memories')
        .insert({
          role_id: roleId,
          content: userMessage.content,
          context_type: 'conversation',
          metadata: {
            thread_id: threadId,
            message_id: userMessage.id,
            timestamp: new Date().toISOString(),
            memory_type: 'conversation',
            importance_score: 1.0,
            conversation_context: {
              previous_messages: previousResponses.map(msg => ({
                content: msg.content,
                role: msg.role?.name
              }))
            }
          }
        });

      console.log('Stored message as memory for role:', roleId);
    } catch (error) {
      console.error('Error storing memory:', error);
      // Continue processing even if memory storage fails
    }
  }

  // Get other roles in the thread
  const { data: threadRoles } = await supabase
    .from('thread_roles')
    .select('roles(*)')
    .eq('thread_id', threadId)
    .neq('role_id', roleId);

  // Get relevant memories for context
  const { data: relevantMemories } = await supabase
    .from('role_memories')
    .select('content, metadata')
    .eq('role_id', roleId)
    .order('importance_score', { ascending: false })
    .limit(5);

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

Current conversation context:
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
    await supabase
      .from('role_memories')
      .insert({
        role_id: roleId,
        content: responseContent,
        context_type: 'response',
        metadata: {
          thread_id: threadId,
          message_id: userMessage.id,
          timestamp: new Date().toISOString(),
          memory_type: 'conversation',
          importance_score: 1.0,
          is_response: true
        }
      });

    console.log('Stored response as memory for role:', roleId);
  } catch (error) {
    console.error('Error storing response memory:', error);
  }

  return responseContent;
}