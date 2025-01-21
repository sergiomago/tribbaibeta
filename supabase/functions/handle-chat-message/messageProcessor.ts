import { Message } from "./types.ts";
import OpenAI from "https://esm.sh/openai@4.26.0";
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

export async function processUserMessage(
  supabase: SupabaseClient,
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
  supabase: SupabaseClient,
  openai: OpenAI,
  threadId: string,
  roleId: string,
  userMessage: Message,
  order: number,
  previousResponses: Message[] = []
): Promise<Message> {
  console.log('Generating response for role:', roleId);

  // Get role details
  const { data: role } = await supabase
    .from('roles')
    .select('*')
    .eq('id', roleId)
    .single();

  if (!role) throw new Error(`Role ${roleId} not found`);

  // Build context from previous responses
  const responseContext = previousResponses.length > 0
    ? "\n\nPrevious responses in this conversation:\n" + 
      previousResponses.map(r => `${r.role?.name}: ${r.content}`).join("\n")
    : "";

  console.log('Generating completion with context:', responseContext);

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
  console.log('Generated response:', responseContent);

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