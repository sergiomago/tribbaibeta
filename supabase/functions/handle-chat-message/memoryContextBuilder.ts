
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

interface MemoryContext {
  relevantMemories: any[];
  conversationHistory: any[];
  contextRelevance: number;
}

export async function buildMemoryContext(
  supabase: SupabaseClient,
  threadId: string,
  roleId: string,
  content: string
): Promise<MemoryContext> {
  console.log('Building memory context for:', { threadId, roleId });

  try {
    // Get relevant memories using similarity search
    const { data: memories, error: memoryError } = await supabase.rpc(
      'get_similar_memories',
      {
        p_embedding: content,
        p_match_threshold: 0.7,
        p_match_count: 5,
        p_role_id: roleId
      }
    );

    if (memoryError) throw memoryError;
    console.log('Retrieved relevant memories:', memories?.length || 0);

    // Get recent conversation history
    const { data: history, error: historyError } = await supabase
      .from('messages')
      .select(`
        content,
        role:roles(name, expertise_areas),
        created_at
      `)
      .eq('thread_id', threadId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (historyError) throw historyError;
    console.log('Retrieved conversation history:', history?.length || 0);

    // Calculate context relevance
    const contextRelevance = calculateContextRelevance(memories || [], content);

    return {
      relevantMemories: memories || [],
      conversationHistory: history || [],
      contextRelevance
    };
  } catch (error) {
    console.error('Error building memory context:', error);
    throw error;
  }
}

function calculateContextRelevance(memories: any[], content: string): number {
  if (!memories.length) return 0;
  
  // Average similarity scores from memories
  const totalSimilarity = memories.reduce((sum, memory) => sum + (memory.similarity || 0), 0);
  return totalSimilarity / memories.length;
}
