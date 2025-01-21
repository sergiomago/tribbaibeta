import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { MessageContext } from "./types.ts";

export async function compileMessageContext(
  supabase: SupabaseClient,
  threadId: string,
  roleId: string,
  content: string
): Promise<MessageContext> {
  console.log('Compiling message context:', { threadId, roleId });

  try {
    // Get relevant memories
    const { data: memories, error: memoriesError } = await supabase.rpc(
      'get_similar_memories',
      {
        p_embedding: content,
        p_match_threshold: 0.7,
        p_match_count: 5,
        p_role_id: roleId
      }
    );

    if (memoriesError) throw memoriesError;

    // Get recent messages from the thread
    const { data: recentMessages, error: messagesError } = await supabase
      .from('messages')
      .select(`
        id,
        content,
        role_id,
        roles:roles!messages_role_id_fkey (
          name,
          tag
        )
      `)
      .eq('thread_id', threadId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (messagesError) throw messagesError;

    // Get conversation depth
    const { data: depth, error: depthError } = await supabase.rpc(
      'get_conversation_depth',
      { 
        p_thread_id: threadId,
        p_role_id: roleId
      }
    );

    if (depthError) throw depthError;

    const context: MessageContext = {
      memories: memories || [],
      previousMessages: recentMessages || [],
      conversationDepth: depth || 0,
      chainContext: {
        lastUpdated: new Date().toISOString(),
        contextType: 'message'
      }
    };

    console.log('Context compiled successfully');
    return context;
  } catch (error) {
    console.error('Error compiling message context:', error);
    throw error;
  }
}