import { supabase } from "@/integrations/supabase/client";
import { MemoryMetadata } from "./types";

export class MemoryStorage {
  static async storeMemory(roleId: string, content: string, contextType: string = 'conversation', topic?: string) {
    try {
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

      if (!response.ok) throw new Error(`API error: ${response.statusText}`);

      const { data } = await response.json();
      const embedding = data[0].embedding;

      const metadata: MemoryMetadata = {
        thread_id: roleId,
        timestamp: new Date().toISOString(),
        topic,
        context_length: content.length,
        expires_at: this.getExpirationDate(),
        interaction_count: 1,
        importance_score: 0.5,
        consolidated: false
      };

      const { error } = await supabase
        .from('role_memories')
        .insert({
          role_id: roleId,
          content,
          embedding,
          context_type: contextType,
          metadata
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error storing memory:', error);
      throw error;
    }
  }

  static async updateMemoryInteractions(memoryIds: string[]) {
    try {
      for (const id of memoryIds) {
        const { data: memory, error: fetchError } = await supabase
          .from('role_memories')
          .select('metadata')
          .eq('id', id)
          .single();

        if (fetchError) throw fetchError;

        const currentMetadata = memory.metadata as MemoryMetadata;
        const newMetadata: MemoryMetadata = {
          ...currentMetadata,
          interaction_count: (currentMetadata.interaction_count || 0) + 1,
          last_accessed: new Date().toISOString()
        };

        const { error: updateError } = await supabase
          .from('role_memories')
          .update({ metadata: newMetadata })
          .eq('id', id);

        if (updateError) throw updateError;
      }
    } catch (error) {
      console.error('Error in updateMemoryInteractions:', error);
    }
  }

  private static getExpirationDate(): string {
    const date = new Date();
    date.setDate(date.getDate() + 30); // 30 days TTL
    return date.toISOString();
  }
}