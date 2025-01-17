import { supabase } from "@/integrations/supabase/client";
import { DatabaseMemory } from "../types/memory";

export class MemoryIndexing {
  private roleId: string;

  constructor(roleId: string) {
    this.roleId = roleId;
  }

  async updateRelevanceScores(memoryIds: string[], newScores: number[]): Promise<void> {
    try {
      for (let i = 0; i < memoryIds.length; i++) {
        const { error } = await supabase
          .from('role_memories')
          .update({ relevance_score: newScores[i] })
          .eq('id', memoryIds[i]);

        if (error) throw error;
      }
      console.log('Memory relevance scores updated successfully');
    } catch (error) {
      console.error('Error updating memory relevance scores:', error);
      throw error;
    }
  }

  async updateContextChain(memoryId: string, contextChain: string[]): Promise<void> {
    try {
      const { error } = await supabase
        .from('role_memories')
        .update({
          context_chain: contextChain,
          updated_at: new Date().toISOString()
        })
        .eq('id', memoryId);

      if (error) throw error;
      console.log('Memory context chain updated successfully');
    } catch (error) {
      console.error('Error updating memory context chain:', error);
      throw error;
    }
  }

  async reindexCategory(category: string): Promise<void> {
    try {
      const { data: memories, error } = await supabase
        .from('role_memories')
        .select('*')
        .eq('role_id', this.roleId)
        .eq('memory_category', category);

      if (error) throw error;

      // Simple reindexing based on recency and access count
      const updates = memories.map(memory => ({
        id: memory.id,
        importance_score: this.calculateImportanceScore(memory)
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('role_memories')
          .update({ importance_score: update.importance_score })
          .eq('id', update.id);

        if (error) throw error;
      }

      console.log(`Reindexed ${updates.length} memories in category ${category}`);
    } catch (error) {
      console.error('Error reindexing category:', error);
      throw error;
    }
  }

  private calculateImportanceScore(memory: DatabaseMemory): number {
    const recency = new Date().getTime() - new Date(memory.created_at).getTime();
    const recencyScore = Math.exp(-recency / (30 * 24 * 60 * 60 * 1000)); // 30 days half-life
    const accessScore = Math.log((memory.access_count || 0) + 1) / Math.log(10);
    return (recencyScore * 0.7 + accessScore * 0.3);
  }
}