import { supabase } from "@/integrations/supabase/client";
import { MemoryMetadata, Memory, toJsonMetadata, fromJsonMetadata } from "./types";

export class MemoryStorage {
  private static readonly BATCH_SIZE = 50;

  static async storeMemory(roleId: string, content: string, contextType: string = 'conversation'): Promise<void> {
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
        timestamp: Date.now(),
        context_type: contextType,
        interaction_count: 1,
        importance_score: 0.5,
        consolidated: false,
        verification_count: 0,
        contradiction_count: 0,
        context_matches: 0
      };

      const { error } = await supabase
        .from('role_memories')
        .insert({
          role_id: roleId,
          content,
          embedding: JSON.stringify(embedding),
          context_type: contextType,
          metadata: toJsonMetadata(metadata),
          verification_status: 'needs_verification',
          verification_score: 0
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error storing memory:', error);
      throw error;
    }
  }

  static async updateMemoryInteractions(memoryIds: string[]): Promise<void> {
    try {
      for (let i = 0; i < memoryIds.length; i += this.BATCH_SIZE) {
        const batch = memoryIds.slice(i, i + this.BATCH_SIZE);
        await this.updateMemoryBatch(batch);
      }
    } catch (error) {
      console.error('Error in updateMemoryInteractions:', error);
      throw error;
    }
  }

  private static async updateMemoryBatch(memoryIds: string[]): Promise<void> {
    for (const id of memoryIds) {
      const { data: memory, error: fetchError } = await supabase
        .from('role_memories')
        .select('metadata')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      if (!memory) continue;

      const currentMetadata = fromJsonMetadata(memory.metadata as Record<string, any>);
      const newMetadata: MemoryMetadata = {
        ...currentMetadata,
        timestamp: currentMetadata.timestamp || Date.now(),
        interaction_count: (currentMetadata.interaction_count || 0) + 1,
        verification_count: (currentMetadata.verification_count || 0) + 1,
        context_matches: (currentMetadata.context_matches || 0) + 1,
        last_verification: new Date().toISOString()
      };

      const { error: updateError } = await supabase
        .from('role_memories')
        .update({ metadata: toJsonMetadata(newMetadata) })
        .eq('id', id);

      if (updateError) throw updateError;
    }
  }
}