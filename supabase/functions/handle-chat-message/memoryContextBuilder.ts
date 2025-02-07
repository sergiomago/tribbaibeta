
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import OpenAI from "https://esm.sh/openai@4.26.0";

interface MemoryContext {
  relevantMemories: any[];
  conversationHistory: any[];
  contextRelevance: number;
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
    // Generate embedding for the content
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: content,
    });
    
    const embedding = embeddingResponse.data[0].embedding;
    console.log('Generated embedding for content');

    // Get relevant memories using similarity search
    const { data: memories, error: memoryError } = await supabase.rpc(
      'get_similar_memories',
      {
        p_embedding: embedding,
        p_match_threshold: 0.7,
        p_match_count: 5,
        p_role_id: roleId
      }
    );

    if (memoryError) throw memoryError;
    console.log('Retrieved relevant memories:', memories?.length || 0);

    // Get conversation history with depth information
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
    console.log('Retrieved conversation history:', history?.length || 0);

    // Calculate conversation depth
    const maxDepth = history?.reduce((max, msg) => 
      Math.max(max, msg.depth_level || 1), 1
    );

    // Calculate context relevance
    const contextRelevance = calculateContextRelevance(memories || [], content);

    return {
      relevantMemories: memories || [],
      conversationHistory: history || [],
      contextRelevance,
      conversationDepth: maxDepth
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
