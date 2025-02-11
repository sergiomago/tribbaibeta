
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import OpenAI from "https://esm.sh/openai@4.26.0";

export async function buildMemoryContext(
  supabase: SupabaseClient,
  openai: OpenAI,
  threadId: string,
  roleId: string,
  content: string
): Promise<{ systemContext: string; enrichedMessage: string }> {
  try {
    // Get relevant memories
    const { data: memories, error: memoriesError } = await supabase
      .from('role_memories')
      .select('*')
      .eq('role_id', roleId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (memoriesError) throw memoriesError;

    // Format memories for context
    const memoryContext = memories?.map(memory => 
      `Previous interaction (${new Date(memory.created_at).toLocaleDateString()}):
      User: ${memory.conversation_context?.user_message || 'Unknown'}
      Your response: ${memory.content}`
    ).join('\n\n') || '';

    // Get conversation depth
    const { data: depth } = await supabase.rpc(
      'get_conversation_depth',
      { p_thread_id: threadId, p_role_id: roleId }
    );

    // Build enriched context
    const enrichedMessage = `
Current conversation depth: ${depth || 1}

Relevant memories from previous interactions:
${memoryContext}

Current user message:
${content}`;

    // Build system context
    const systemContext = `
You have access to memories from previous interactions.
Use these memories to:
1. Maintain consistency in your responses
2. Reference previous conversations when relevant
3. Build upon established context
4. Avoid repeating yourself`;

    return {
      systemContext,
      enrichedMessage
    };
  } catch (error) {
    console.error('Error building memory context:', error);
    return {
      systemContext: '',
      enrichedMessage: content
    };
  }
}
