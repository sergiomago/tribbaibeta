import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Memory } from "./types.ts";

export class MemoryManager {
  private supabase;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async createEmbedding(content: string): Promise<{ vector: number[] }> {
    const { data, error } = await this.supabase.functions.invoke(
      'create-embedding',
      { body: { content } }
    );

    if (error) throw error;
    return data;
  }

  async storeMemory(roleId: string, content: string, threadId: string, messageId: string, embedding: number[]) {
    const { error } = await this.supabase
      .from('role_memories')
      .insert({
        role_id: roleId,
        content,
        embedding,
        context_type: 'conversation',
        metadata: {
          thread_id: threadId,
          message_id: messageId,
          timestamp: new Date().toISOString()
        }
      });

    if (error) throw error;
  }

  async retrieveRelevantMemories(roleId: string, embedding: number[]): Promise<Memory[]> {
    const { data, error } = await this.supabase.rpc(
      'get_similar_memories',
      {
        p_embedding: embedding,
        p_match_threshold: 0.7,
        p_match_count: 5,
        p_role_id: roleId
      }
    );

    if (error) throw error;
    return data || [];
  }

  formatMemoryContext(memories: Memory[]): string {
    if (memories.length === 0) return '';
    
    return 'Relevant context from memory:\n' + 
      memories
        .map(m => `- ${m.content}`)
        .join('\n');
  }
}