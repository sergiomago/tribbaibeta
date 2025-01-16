import OpenAI from "https://esm.sh/openai@4.26.0";
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

export async function handleInitialAnalysis(
  supabase: SupabaseClient,
  threadId: string,
  content: string,
  openai: OpenAI
) {
  console.log('Performing initial analysis...');
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'Analyze the user message and determine the primary intent and any special requirements.'
      },
      { role: 'user', content }
    ],
  });

  const analysis = completion.choices[0].message.content;
  
  await supabase
    .from('conversation_states')
    .update({
      current_state: 'role_selection',
      metadata: { analysis, original_message: content }
    })
    .eq('thread_id', threadId);

  return analysis;
}

export async function saveUserMessage(
  supabase: SupabaseClient,
  threadId: string,
  content: string,
  taggedRoleId?: string
) {
  const { data: message, error } = await supabase
    .from('messages')
    .insert({
      thread_id: threadId,
      content,
      tagged_role_id: taggedRoleId || null,
    })
    .select()
    .single();

  if (error) throw error;
  return message;
}

export async function storeRoleMemory(
  supabase: SupabaseClient,
  roleId: string,
  content: string,
  metadata: any
) {
  await supabase
    .from('role_memories')
    .insert({
      role_id: roleId,
      content,
      context_type: 'conversation',
      context_relevance: 1.0,
      metadata
    });
}