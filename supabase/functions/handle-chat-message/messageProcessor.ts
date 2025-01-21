import { Message } from "./types.ts";
import { classifyMessage, buildResponseChain } from "./messageClassifier.ts";

export async function processUserMessage(
  supabase: any,
  threadId: string,
  content: string,
  taggedRoleId?: string | null
): Promise<Message> {
  // Save user message
  const { data: message, error } = await supabase
    .from('messages')
    .insert({
      thread_id: threadId,
      content,
      tagged_role_id: taggedRoleId,
      message_type: 'text'
    })
    .select()
    .single();

  if (error) throw error;
  return message;
}

export async function generateRoleResponse(
  supabase: any,
  openai: any,
  threadId: string,
  roleId: string,
  userMessage: Message,
  order: number,
  previousResponses: Message[] = []
): Promise<Message> {
  // Get role details
  const { data: role } = await supabase
    .from('roles')
    .select('*')
    .eq('id', roleId)
    .single();

  if (!role) throw new Error(`Role ${roleId} not found`);

  // Build context from previous responses
  const responseContext = previousResponses.length > 0
    ? "\n\nPrevious responses from other roles:\n" + 
      previousResponses.map(r => `${r.role?.name}: ${r.content}`).join("\n")
    : "";

  // Generate response using OpenAI
  const completion = await openai.chat.completions.create({
    model: role.model || 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `${role.instructions}${responseContext}`
      },
      { role: 'user', content: userMessage.content }
    ],
  });

  const responseContent = completion.choices[0].message.content;

  // Save response
  const { data: savedMessage, error } = await supabase
    .from('messages')
    .insert({
      thread_id: threadId,
      role_id: roleId,
      content: responseContent,
      chain_id: userMessage.id,
      chain_order: order,
      message_type: 'text'
    })
    .select(`
      *,
      role:roles(name, tag)
    `)
    .single();

  if (error) throw error;
  return savedMessage;
}