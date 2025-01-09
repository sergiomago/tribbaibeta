import { supabase } from "@/integrations/supabase/client";
import { MemoryMetadata } from "./types";
import { MemoryScoring } from "./scoring";

export class MemoryMaintenance {
  private static readonly MIN_IMPORTANCE_SCORE = 0.3;
  private static readonly TTL_DAYS = 30;

  static async pruneExpiredMemories(roleId: string) {
    try {
      // Get memories that are expired but important
      const { data: importantMemories, error: importantError } = await supabase
        .from('role_memories')
        .select('*')
        .eq('role_id', roleId)
        .lt('metadata->expires_at', new Date().toISOString())
        .gte('metadata->importance_score', this.MIN_IMPORTANCE_SCORE);

      if (importantError) throw importantError;

      // Extend TTL for important memories
      if (importantMemories && importantMemories.length > 0) {
        for (const memory of importantMemories) {
          const currentMetadata = memory.metadata as unknown as MemoryMetadata;
          const newMetadata: MemoryMetadata = {
            ...currentMetadata,
            expires_at: this.getExpirationDate(),
            importance_score: MemoryScoring.calculateImportanceScore({
              content: memory.content,
              metadata: currentMetadata
            })
          };

          await supabase
            .from('role_memories')
            .update({ metadata: newMetadata })
            .eq('id', memory.id);
        }
      }

      // Delete expired unimportant memories
      const { error } = await supabase
        .from('role_memories')
        .delete()
        .eq('role_id', roleId)
        .lt('metadata->expires_at', new Date().toISOString())
        .lt('metadata->importance_score', this.MIN_IMPORTANCE_SCORE);

      if (error) throw error;
    } catch (error) {
      console.error('Error pruning expired memories:', error);
      throw error;
    }
  }

  private static getExpirationDate(): string {
    const date = new Date();
    date.setDate(date.getDate() + this.TTL_DAYS);
    return date.toISOString();
  }
}