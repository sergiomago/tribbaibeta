import OpenAI from "https://esm.sh/openai@4.26.0";
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

export async function generateRoleResponse(
  supabase: SupabaseClient,
  threadId: string,
  roleId: string,
  userMessage: any,
  memories: any[],
  openai: OpenAI
) {
  // Get role details with capabilities
  const { data: role } = await supabase
    .from('roles')
    .select('*, thread_roles!inner(*)')
    .eq('id', roleId)
    .eq('thread_roles.thread_id', threadId)
    .single();

  if (!role) throw new Error(`Role ${roleId} not found`);

  // Get previous messages for context
  const { data: previousMessages } = await supabase
    .from('messages')
    .select(`
      content,
      role:roles (name, tag),
      chain_order,
      created_at
    `)
    .eq('thread_id', threadId)
    .order('created_at', { ascending: false })
    .limit(5);

  const conversationContext = previousMessages
    ?.map(msg => `${msg.role?.name || 'User'}: ${msg.content}`)
    .reverse()
    .join('\n');

  const memoryContext = memories?.length 
    ? `Relevant context from your memory:\n${memories.map(m => m.content).join('\n\n')}`
    : '';

  // Build specialized system prompt based on role capabilities
  let systemPrompt = role.instructions;
  
  if (role.special_capabilities?.length) {
    systemPrompt += '\n\nSpecial Capabilities:\n';
    role.special_capabilities.forEach((capability: string) => {
      systemPrompt += `- You can use ${capability}\n`;
    });
  }

  systemPrompt += `\n\n${memoryContext}\n\nRecent conversation:\n${conversationContext}`;

  const completion = await openai.chat.completions.create({
    model: role.model || 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: systemPrompt
      },
      { role: 'user', content: userMessage.content }
    ],
  });

  const responseContent = completion.choices[0].message.content;

  // Save response
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

  // Record interaction
  await recordInteraction(supabase, threadId, roleId, userMessage.tagged_role_id, null, memories?.length || 0);

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