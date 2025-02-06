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

  // Get chain position information
  const { data: threadRoles } = await supabase
    .from('thread_roles')
    .select('role_id')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true });

  const totalRoles = threadRoles?.length || 0;
  const currentPosition = threadRoles?.findIndex(tr => tr.role_id === roleId) + 1 || 0;
  
  // Get previous and next role information
  const previousRoleId = currentPosition > 1 ? threadRoles[currentPosition - 2]?.role_id : null;
  const nextRoleId = currentPosition < totalRoles ? threadRoles[currentPosition]?.role_id : null;

  // Get previous and next role details if they exist
  const [previousRole, nextRole] = await Promise.all([
    previousRoleId ? supabase.from('roles').select('name, expertise_areas').eq('id', previousRoleId).single() : null,
    nextRoleId ? supabase.from('roles').select('name, expertise_areas').eq('id', nextRoleId).single() : null,
  ]);

  // Get recent memories
  const { data: memories } = await supabase
    .from('role_memories')
    .select('content')
    .eq('role_id', roleId)
    .order('created_at', { ascending: false })
    .limit(5);

  console.log('Retrieved memories:', memories?.length || 0);

  // Format previous responses
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

  // Create the system prompt with the new structure
  const systemPrompt = `You are ${role.name}, responding as position ${currentPosition} of ${totalRoles} roles in this conversation.

Context about your turn:
${previousRole ? `- Previous role: ${previousRole.data.name} (expertise: ${previousRole.data.expertise_areas?.join(', ')})` : '- You are the first role to respond'}
${nextRole ? `- Next role: ${nextRole.data.name} (expertise: ${nextRole.data.expertise_areas?.join(', ')})` : '- You are the last role to respond'}

${previousResponses.length > 0 ? `Previous responses in this chain:\n${formattedResponses}` : 'You are the first to respond to this message.'}

Important Instructions:
1. Build upon previous responses using your specific expertise
2. Complement, don't contradict previous roles
3. Focus on adding value from your unique perspective
4. Keep your response focused and relevant to the user's query
${nextRole ? `5. Tag the next role when you finish (@${nextRole.data.name})` : '5. Conclude the response chain effectively'}
6. Be clear and concise
7. Reference other roles when needed
8. Maintain conversation context

Current context:
${memoryContext}

Your role instructions:
${role.instructions}

Recent conversation context:
${userMessage.content}`;

  // Store message as memory
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
        importance_score: 1.0
      });
  } catch (error) {
    console.error('Error storing memory:', error);
  }

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

  // Store response as memory
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
        importance_score: 1.0
      });
  } catch (error) {
    console.error('Error storing response memory:', error);
  }

  return responseContent;
}