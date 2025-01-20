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

  // Get previous messages for interactive context
  const { data: previousMessages } = await supabase
    .from('messages')
    .select(`
      content,
      role:roles (name, tag, special_capabilities),
      chain_order,
      created_at,
      metadata
    `)
    .eq('thread_id', threadId)
    .order('created_at', { ascending: false })
    .limit(5);

  // Build rich conversation context
  const conversationContext = previousMessages
    ?.map(msg => {
      const roleInfo = msg.role?.name ? 
        `${msg.role.name} (${msg.role.tag})${msg.role.special_capabilities?.length ? 
          ` with capabilities: ${msg.role.special_capabilities.join(', ')}` : 
          ''}` : 
        'User';
      return `${roleInfo}: ${msg.content}`;
    })
    .reverse()
    .join('\n');

  // Process memories for relevant context
  const memoryContext = memories?.length 
    ? `Relevant context from your memory:\n${memories.map(m => 
        `[Relevance: ${m.similarity.toFixed(2)}] ${m.content}`
      ).join('\n\n')}`
    : '';

  // Build specialized system prompt
  let systemPrompt = role.instructions + '\n\n';
  
  // Add interactive chain awareness
  systemPrompt += `You are part of an interactive response chain. ${
    previousMessages?.length ? 
    'Build upon previous responses and maintain conversation coherence. ' : 
    'You are starting a new conversation thread. '
  }`;

  // Add capability-specific instructions
  if (role.special_capabilities?.length) {
    systemPrompt += '\nYour special capabilities:\n';
    role.special_capabilities.forEach((capability: string) => {
      systemPrompt += `- You can use ${capability}\n`;
    });
  }

  // Add context sections
  systemPrompt += `\n\n${memoryContext}\n\nRecent conversation:\n${conversationContext}`;

  // Generate response
  const completion = await openai.chat.completions.create({
    model: role.model || 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage.content }
    ],
  });

  const responseContent = completion.choices[0].message.content;

  // Save response with enhanced metadata
  const { data: savedMessage } = await supabase
    .from('messages')
    .insert({
      thread_id: threadId,
      role_id: roleId,
      content: responseContent,
      chain_id: userMessage.id,
      metadata: {
        response_type: 'interactive_chain',
        previous_context: previousMessages?.map(m => m.id),
        used_memories: memories?.map(m => m.id),
        timestamp: new Date().toISOString()
      }
    })
    .select()
    .single();

  // Record interaction with enhanced metrics
  await recordInteraction(
    supabase, 
    threadId, 
    roleId, 
    userMessage.tagged_role_id, 
    previousMessages?.length || 0,
    memories?.length || 0
  );

  return { savedMessage, role };
}

export async function recordInteraction(
  supabase: SupabaseClient,
  threadId: string,
  roleId: string,
  taggedRoleId: string | null,
  contextMessageCount: number,
  memoryCount: number
) {
  await supabase
    .from('role_interactions')
    .insert({
      thread_id: threadId,
      initiator_role_id: roleId,
      responder_role_id: taggedRoleId || roleId,
      interaction_type: taggedRoleId ? 'direct_response' : 'chain_response',
      metadata: {
        context_type: 'interactive_chain',
        context_message_count: contextMessageCount,
        memory_count: memoryCount,
        timestamp: new Date().toISOString()
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