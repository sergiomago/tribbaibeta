import OpenAI from "https://esm.sh/openai@4.26.0";
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

async function getPreviousResponses(
  supabase: SupabaseClient,
  threadId: string,
  chainId: string
) {
  const { data: previousResponses } = await supabase
    .from('messages')
    .select('content, roles:roles(name)')
    .eq('thread_id', threadId)
    .eq('chain_id', chainId)
    .order('chain_order', { ascending: true });
    
  return previousResponses || [];
}

export async function generateRoleResponse(
  supabase: SupabaseClient,
  threadId: string,
  roleId: string,
  userMessage: any,
  memories: any[],
  openai: OpenAI
) {
  const { data: role } = await supabase
    .from('roles')
    .select('*')
    .eq('id', roleId)
    .single();

  if (!role) throw new Error(`Role ${roleId} not found`);

  // Get previous responses in this chain
  const previousResponses = await getPreviousResponses(supabase, threadId, userMessage.id);
  
  const conversationContext = previousResponses.length > 0 
    ? `Previous responses in this conversation:\n${previousResponses.map(r => 
        `${r.roles.name}: ${r.content}`
      ).join('\n')}`
    : '';

  const memoryContext = memories?.length 
    ? `Relevant context from your memory:\n${memories.map(m => m.content).join('\n\n')}`
    : '';

  const completion = await openai.chat.completions.create({
    model: role.model || 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `${role.instructions}\n\n${memoryContext}\n\n${conversationContext}`
      },
      { role: 'user', content: userMessage.content }
    ],
  });

  const responseContent = completion.choices[0].message.content;

  const { data: savedMessage } = await supabase
    .from('messages')
    .insert({
      thread_id: threadId,
      role_id: roleId,
      content: responseContent,
      chain_id: userMessage.id,
    })
    .select()
    .single();

  return { savedMessage, role };
}

export async function recordInteraction(
  supabase: SupabaseClient,
  threadId: string,
  roleId: string,
  taggedRoleId: string | null,
  analysis: string | null,
  memoryCount: number
) {
  await supabase
    .from('role_interactions')
    .insert({
      thread_id: threadId,
      initiator_role_id: roleId,
      responder_role_id: taggedRoleId || roleId,
      interaction_type: taggedRoleId ? 'direct_response' : 'analysis_based',
      metadata: {
        context_type: 'conversation',
        analysis: analysis || null,
        memory_count: memoryCount
      }
    });
}

export async function updateMemoryRelevance(
  supabase: SupabaseClient,
  memories: any[]
) {
  for (const memory of memories) {
    await supabase
      .from('role_memories')
      .update({ 
        context_relevance: memory.similarity,
        access_count: supabase.sql`access_count + 1`,
        last_accessed: new Date().toISOString()
      })
      .eq('id', memory.id);
  }
}