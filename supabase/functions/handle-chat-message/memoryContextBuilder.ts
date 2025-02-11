import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import OpenAI from "https://esm.sh/openai@4.26.0";

interface MemoryContext {
  systemContext: string;
  enrichedMessage: string;
  relevance: number;
  conversationDepth: number;
}

export async function buildMemoryContext(
  supabase: SupabaseClient,
  openai: OpenAI,
  threadId: string,
  roleId: string,
  content: string
): Promise<MemoryContext> {
  console.log('Building memory context for:', { threadId, roleId });

  try {
    // Get role's mind
    const { data: mindData, error: mindError } = await supabase
      .from('role_minds')
      .select('*')
      .eq('role_id', roleId)
      .eq('status', 'active')
      .single();

    if (mindError || !mindData) {
      throw new Error(`No active mind found for role ${roleId}`);
    }

    // Get conversation history
    const { data: history, error: historyError } = await supabase
      .from('messages')
      .select(`
        content,
        role:roles!messages_role_id_fkey (
          name,
          expertise_areas
        ),
        created_at,
        depth_level,
        conversation_context
      `)
      .eq('thread_id', threadId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (historyError) throw historyError;

    // Format conversation history for mind
    const conversationThread = history?.map(msg => ({
      role: msg.role ? 'assistant' : 'user',
      content: msg.content,
      name: msg.role?.name,
      expertise: msg.role?.expertise_areas
    })) || [];

    // Use mind to enrich context
    const enrichedContext = await mindData.remember({
      thread: conversationThread,
      content
    });

    // Calculate conversation depth
    const maxDepth = history?.reduce((max, msg) => 
      Math.max(max, msg.depth_level || 1), 1
    );

    return {
      systemContext: enrichedContext.systemContext || '',
      enrichedMessage: enrichedContext.enrichedMessage || content,
      relevance: enrichedContext.relevance || 0,
      conversationDepth: maxDepth
    };
  } catch (error) {
    console.error('Error building memory context:', error);
    throw error;
  }
}