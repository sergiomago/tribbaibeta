import { supabase } from "@/integrations/supabase/client";
import { Json } from "@/integrations/supabase/types";

interface MemoryMetadata {
  message_id?: string;
  thread_id?: string;
  timestamp?: string;
  memory_type?: string;
  [key: string]: any;
}

type RoleMemory = {
  id: string;
  content: string;
  context_type: string;
  metadata: Json;
  relevance_score?: number;
};

export class MemoryManager {
  private roleId: string;

  constructor(roleId: string) {
    this.roleId = roleId;
  }

  private toJsonMetadata(metadata: MemoryMetadata): Json {
    return metadata as Json;
  }

  async storeMemory(content: string, contextType: string, metadata: MemoryMetadata = {}) {
    try {
      const { error } = await supabase
        .from('role_memories')
        .insert({
          role_id: this.roleId,
          content,
          context_type: contextType,
          metadata: this.toJsonMetadata({
            ...metadata,
            timestamp: new Date().toISOString(),
            memory_type: 'conversation'
          }),
          importance_score: 1.0
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error storing memory:', error);
      throw error;
    }
  }

  async retrieveMemories(limit: number = 5) {
    try {
      const { data, error } = await supabase
        .from('role_memories')
        .select('*')
        .eq('role_id', this.roleId)
        .order('importance_score', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as RoleMemory[];
    } catch (error) {
      console.error('Error retrieving memories:', error);
      throw error;
    }
  }

  async updateMemoryRelevance(memoryId: string, relevanceScore: number) {
    try {
      const { error } = await supabase
        .from('role_memories')
        .update({ relevance_score: relevanceScore })
        .eq('id', memoryId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating memory relevance:', error);
      throw error;
    }
  }
}