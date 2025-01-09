import { supabase } from "@/integrations/supabase/client";

export class LlongtermManager {
  private roleId: string;
  private threadId: string;

  constructor(roleId: string, threadId: string) {
    this.roleId = roleId;
    this.threadId = threadId;
  }

  async storeMemory(content: string, contextType: string = 'conversation') {
    try {
      const { data: embedding, error } = await supabase.functions.invoke('create-embedding', {
        body: { content }
      });

      if (error) throw error;

      const { error: insertError } = await supabase
        .from('role_memories')
        .insert({
          role_id: this.roleId,
          content,
          embedding: embedding.vector,
          context_type: contextType,
          metadata: {
            thread_id: this.threadId,
            timestamp: new Date().toISOString()
          }
        });

      if (insertError) throw insertError;
      console.log('Memory stored successfully with embedding');
    } catch (error) {
      console.error('Error storing memory with embedding:', error);
      throw error;
    }
  }

  async retrieveRelevantMemories(query: string, limit: number = 5, threshold: number = 0.7) {
    try {
      const { data: embedding, error: embeddingError } = await supabase.functions.invoke('create-embedding', {
        body: { content: query }
      });

      if (embeddingError) throw embeddingError;

      const { data: memories, error: searchError } = await supabase.rpc(
        'get_similar_memories',
        {
          p_embedding: embedding.vector,
          p_match_threshold: threshold,
          p_match_count: limit,
          p_role_id: this.roleId
        }
      );

      if (searchError) throw searchError;
      return memories;
    } catch (error) {
      console.error('Error retrieving memories:', error);
      throw error;
    }
  }
}

export const createLlongtermManager = (roleId: string, threadId: string) => {
  return new LlongtermManager(roleId, threadId);
};