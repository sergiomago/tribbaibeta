import { supabase } from "@/integrations/supabase/client";
import { Json } from "@/integrations/supabase/types";

interface MemoryMetadata extends Record<string, Json> {
  thread_id: string;
  timestamp: string;
  topic?: string;
  relevance_score?: number;
  interaction_count?: number;
  last_accessed?: string;
  context_length?: number;
  expires_at?: string;
}

export class LlongtermManager {
  private roleId: string;
  private threadId: string;
  private readonly TTL_DAYS = 30;
  private readonly MAX_CONTEXT_LENGTH = 4000;
  private readonly MIN_RELEVANCE_SCORE = 0.6;

  constructor(roleId: string, threadId: string) {
    this.roleId = roleId;
    this.threadId = threadId;
  }

  private calculateContextWindow(content: string): number {
    const baseLength = 5;
    const contentLength = content.length;
    if (contentLength > this.MAX_CONTEXT_LENGTH) {
      return Math.max(3, Math.floor(baseLength * 0.5));
    }
    return baseLength;
  }

  private getExpirationDate(): string {
    const date = new Date();
    date.setDate(date.getDate() + this.TTL_DAYS);
    return date.toISOString();
  }

  async storeMemory(content: string, contextType: string = 'conversation', topic?: string) {
    try {
      console.log('Storing memory with content:', content);
      
      // Get embedding from Llongterm
      const response = await fetch('https://api.llongterm.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.LLONGTERM_API_KEY}`
        },
        body: JSON.stringify({
          input: content,
          model: "text-embedding-ada-002",
          encoding_format: "float"
        })
      });

      if (!response.ok) {
        throw new Error(`Llongterm API error: ${response.statusText}`);
      }

      const { data } = await response.json();
      const embedding = data[0].embedding;

      const metadata: MemoryMetadata = {
        thread_id: this.threadId,
        timestamp: new Date().toISOString(),
        topic,
        context_length: content.length,
        expires_at: this.getExpirationDate(),
        interaction_count: 1
      };

      const { error } = await supabase
        .from('role_memories')
        .insert({
          role_id: this.roleId,
          content,
          embedding,
          context_type: contextType,
          metadata
        });

      if (error) throw error;
      console.log('Memory stored successfully with metadata:', metadata);
    } catch (error) {
      console.error('Error storing memory:', error);
      throw error;
    }
  }

  async getSimilarMemories(content: string, matchThreshold = 0.7, matchCount = 5) {
    try {
      console.log('Retrieving similar memories for content:', content);
      
      const adjustedMatchCount = this.calculateContextWindow(content);
      
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

      const { data: memories, error } = await supabase
        .rpc('get_similar_memories', {
          p_embedding: embedding,
          p_match_threshold: Math.max(this.MIN_RELEVANCE_SCORE, matchThreshold),
          p_match_count: adjustedMatchCount,
          p_role_id: this.roleId
        });

      if (error) throw error;

      if (memories && memories.length > 0) {
        await this.updateMemoryInteractions(memories.map(m => m.id));
      }

      console.log(`Retrieved ${memories?.length || 0} similar memories`);
      return memories;
    } catch (error) {
      console.error('Error retrieving similar memories:', error);
      throw error;
    }
  }

  private async updateMemoryInteractions(memoryIds: string[]) {
    try {
      const { error } = await supabase
        .from('role_memories')
        .update({
          metadata: {
            interaction_count: '(COALESCE((metadata->>"interaction_count")::int, 0) + 1)',
            last_accessed: new Date().toISOString()
          }
        })
        .in('id', memoryIds);

      if (error) {
        console.error('Error updating memory interactions:', error);
      }
    } catch (error) {
      console.error('Error in updateMemoryInteractions:', error);
    }
  }

  async pruneExpiredMemories() {
    try {
      const { error } = await supabase
        .from('role_memories')
        .delete()
        .eq('role_id', this.roleId)
        .lt('metadata->>expires_at', new Date().toISOString());

      if (error) {
        console.error('Error pruning expired memories:', error);
        throw error;
      }
      console.log('Successfully pruned expired memories');
    } catch (error) {
      console.error('Error in pruneExpiredMemories:', error);
      throw error;
    }
  }
}

export const createLlongtermManager = (roleId: string, threadId: string) => {
  return new LlongtermManager(roleId, threadId);
};