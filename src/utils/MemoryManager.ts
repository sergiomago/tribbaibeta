import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Json } from "@/integrations/supabase/types";

type RoleMemoryInsert = Database['public']['Tables']['role_memories']['Insert'];
type RoleMemoryRow = Database['public']['Tables']['role_memories']['Row'];

interface MemoryMetadata {
  thread_id: string;
  timestamp: string;
  memory_type: 'conversation';
}

// Helper function to convert MemoryMetadata to Json type
const toJsonMetadata = (metadata: MemoryMetadata): Json => {
  return {
    thread_id: metadata.thread_id,
    timestamp: metadata.timestamp,
    memory_type: metadata.memory_type
  } as Json;
};

export class MemoryManager {
  private roleId: string;
  private threadId: string;

  constructor(roleId: string, threadId: string) {
    this.roleId = roleId;
    this.threadId = threadId;
  }

  async storeMemory(content: string, contextType: string = 'conversation'): Promise<void> {
    try {
      const metadata: MemoryMetadata = {
        thread_id: this.threadId,
        timestamp: new Date().toISOString(),
        memory_type: 'conversation'
      };

      const memoryData: RoleMemoryInsert = {
        role_id: this.roleId,
        content,
        context_type: contextType,
        metadata: toJsonMetadata(metadata),
        importance_score: 1.0
      };

      const { error } = await supabase
        .from('role_memories')
        .insert(memoryData);

      if (error) throw error;
      console.log('Memory stored successfully:', { roleId: this.roleId, content });
    } catch (error) {
      console.error('Error storing memory:', error);
      throw error;
    }
  }

  async retrieveMemories(limit: number = 10) {
    try {
      const { data, error } = await supabase
        .from('role_memories')
        .select('*')
        .eq('role_id', this.roleId)
        .eq('metadata->thread_id', this.threadId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error retrieving memories:', error);
      throw error;
    }
  }

  async clearMemories(): Promise<void> {
    try {
      const { error } = await supabase
        .from('role_memories')
        .delete()
        .eq('role_id', this.roleId)
        .eq('metadata->thread_id', this.threadId);

      if (error) throw error;
      console.log('Memories cleared successfully for role:', this.roleId);
    } catch (error) {
      console.error('Error clearing memories:', error);
      throw error;
    }
  }
}

export const createMemoryManager = (roleId: string, threadId: string): MemoryManager => {
  return new MemoryManager(roleId, threadId);
};