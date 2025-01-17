import { supabase } from "@/integrations/supabase/client";
import { DatabaseMemory, Memory, MemoryMetadata } from "../types/memory";

export class MemoryStore {
  private roleId: string;

  constructor(roleId: string) {
    this.roleId = roleId;
  }

  async store(content: string, metadata: MemoryMetadata): Promise<void> {
    try {
      const { error } = await supabase
        .from('role_memories')
        .insert({
          role_id: this.roleId,
          content,
          context_type: metadata.context_type || 'general',
          metadata: metadata as Json,
          memory_category: metadata.memory_category || 'general',
          source_type: metadata.source_type || 'direct',
          importance_score: metadata.importance_score || 1.0,
          confidence_score: metadata.confidence_score || 1.0,
          context_chain: metadata.context_chain || []
        });

      if (error) throw error;
      console.log('Memory stored successfully:', { content, metadata });
    } catch (error) {
      console.error('Error storing memory:', error);
      throw error;
    }
  }

  async update(memoryId: string, updates: Partial<DatabaseMemory>): Promise<void> {
    try {
      const { error } = await supabase
        .from('role_memories')
        .update(updates)
        .eq('id', memoryId);

      if (error) throw error;
      console.log('Memory updated successfully:', { memoryId, updates });
    } catch (error) {
      console.error('Error updating memory:', error);
      throw error;
    }
  }

  async delete(memoryId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('role_memories')
        .delete()
        .eq('id', memoryId);

      if (error) throw error;
      console.log('Memory deleted successfully:', memoryId);
    } catch (error) {
      console.error('Error deleting memory:', error);
      throw error;
    }
  }
}