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
      // Get embedding from Llongterm
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

      if (!response.ok) {
        throw new Error(`Llongterm API error: ${response.statusText}`);
      }

      const { data } = await response.json();
      const embedding = data[0].embedding;

      // Store in Supabase
      const { error } = await supabase
        .from('role_memories')
        .insert({
          role_id: this.roleId,
          content,
          embedding,
          context_type: contextType,
          metadata: {
            thread_id: this.threadId,
            timestamp: new Date().toISOString()
          }
        });

      if (error) throw error;
      console.log('Memory stored successfully');
    } catch (error) {
      console.error('Error storing memory:', error);
      throw error;
    }
  }

  async getSimilarMemories(content: string, matchThreshold = 0.7, matchCount = 5) {
    try {
      // Get embedding from Llongterm
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

      if (!response.ok) {
        throw new Error(`Llongterm API error: ${response.statusText}`);
      }

      const { data } = await response.json();
      const embedding = data[0].embedding;

      // Query similar memories from Supabase
      const { data: memories, error } = await supabase
        .rpc('get_similar_memories', {
          p_embedding: embedding,
          p_match_threshold: matchThreshold,
          p_match_count: matchCount,
          p_role_id: this.roleId
        });

      if (error) throw error;
      return memories;
    } catch (error) {
      console.error('Error retrieving similar memories:', error);
      throw error;
    }
  }
}

export const createLlongtermManager = (roleId: string, threadId: string) => {
  return new LlongtermManager(roleId, threadId);
};