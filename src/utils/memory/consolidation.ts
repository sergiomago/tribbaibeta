import { supabase } from "@/integrations/supabase/client";
import { MemoryMetadata, JsonMetadata } from "./types";

export class MemoryConsolidation {
  private static readonly CONSOLIDATION_THRESHOLD = 0.85;

  static async consolidateMemories(roleId: string) {
    try {
      const { data: memories, error } = await supabase
        .from('role_memories')
        .select('*')
        .eq('role_id', roleId)
        .eq('metadata->consolidated', false);

      if (error) throw error;
      if (!memories || memories.length === 0) return;

      for (const memory of memories) {
        const similarMemories = await this.getSimilarMemories(
          memory.content,
          roleId,
          this.CONSOLIDATION_THRESHOLD,
          5
        );

        if (similarMemories && similarMemories.length > 1) {
          // Combine similar memories
          const combinedContent = similarMemories
            .map(m => m.content)
            .join('\n\n');

          // Create a new consolidated memory
          await this.storeMemory(
            combinedContent,
            'consolidated',
            (memory.metadata as unknown as MemoryMetadata).topic
          );

          // Mark original memories as consolidated
          const memoryIds = similarMemories.map(m => m.id);
          const updateMetadata: JsonMetadata = {
            consolidated: true,
            timestamp: new Date().toISOString()
          } as JsonMetadata;

          await supabase
            .from('role_memories')
            .update({ metadata: updateMetadata })
            .in('id', memoryIds);
        }
      }
    } catch (error) {
      console.error('Error during memory consolidation:', error);
    }
  }

  private static async getSimilarMemories(content: string, roleId: string, threshold: number, limit: number) {
    try {
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

      if (!response.ok) throw new Error(`API error: ${response.statusText}`);

      const { data } = await response.json();
      const embedding = data[0].embedding;

      const { data: memories, error } = await supabase
        .rpc('get_similar_memories', {
          p_embedding: embedding,
          p_match_threshold: threshold,
          p_match_count: limit,
          p_role_id: roleId
        });

      if (error) throw error;
      return memories;
    } catch (error) {
      console.error('Error retrieving similar memories:', error);
      throw error;
    }
  }

  private static async storeMemory(content: string, contextType: string = 'conversation', topic?: string) {
    // Implementation moved to MemoryStorage class
    // This is just a placeholder to maintain the interface
    console.log('Memory storage moved to MemoryStorage class');
  }
}