import { supabase } from "@/integrations/supabase/client";

export class MemoryContextManager {
  private roleId: string;
  private readonly RELEVANCE_THRESHOLD = 0.7;

  constructor(roleId: string) {
    this.roleId = roleId;
  }

  async storeMemoryWithContext(content: string, contextType: string, metadata: any = {}) {
    try {
      // Get embedding from API
      const response = await fetch('https://api.llongterm.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.LLONGTERM_API_KEY}`
        },
        body: JSON.stringify({
          input: content,
          model: "text-embedding-ada-002"
        })
      });

      if (!response.ok) throw new Error('Failed to generate embedding');
      
      const { data } = await response.json();
      const embedding = data[0].embedding;

      // Store memory with context
      const { error } = await supabase
        .from('role_memories')
        .insert({
          role_id: this.roleId,
          content,
          embedding: JSON.stringify(embedding),
          context_type: contextType,
          context_relevance: 1.0, // Initial relevance score
          metadata: {
            ...metadata,
            timestamp: Date.now(),
            context_source: contextType
          }
        });

      if (error) throw error;
      
      console.log('Memory stored with context:', { content, contextType });
    } catch (error) {
      console.error('Error storing memory with context:', error);
      throw error;
    }
  }

  async retrieveRelevantMemories(query: string, limit: number = 5) {
    try {
      const response = await fetch('https://api.llongterm.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.LLONGTERM_API_KEY}`
        },
        body: JSON.stringify({
          input: query,
          model: "text-embedding-ada-002"
        })
      });

      if (!response.ok) throw new Error('Failed to generate query embedding');
      
      const { data } = await response.json();
      const queryEmbedding = data[0].embedding;

      const { data: memories, error } = await supabase
        .rpc('get_similar_memories', {
          p_embedding: queryEmbedding,
          p_match_threshold: this.RELEVANCE_THRESHOLD,
          p_match_count: limit,
          p_role_id: this.roleId
        });

      if (error) throw error;

      return memories;
    } catch (error) {
      console.error('Error retrieving relevant memories:', error);
      throw error;
    }
  }

  async updateMemoryRelevance(memoryId: string, newRelevanceScore: number) {
    try {
      const { error } = await supabase
        .from('role_memories')
        .update({ context_relevance: newRelevanceScore })
        .eq('id', memoryId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating memory relevance:', error);
      throw error;
    }
  }
}

export const createMemoryContextManager = (roleId: string) => {
  return new MemoryContextManager(roleId);
};