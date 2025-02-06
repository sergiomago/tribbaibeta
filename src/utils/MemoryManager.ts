import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

// Define memory data type using Database types
type RoleMemory = Database['public']['Tables']['role_memories']['Row'];

export class MemoryManager {
  private roleId: string;
  private threadId: string;

  constructor(roleId: string, threadId: string) {
    this.roleId = roleId;
    this.threadId = threadId;
  }

  async storeMemory(content: string, contextType: string = 'conversation'): Promise<void> {
    try {
      const { error } = await supabase
        .from('role_memories')
        .insert({
          role_id: this.roleId,
          content,
          context_type: contextType,
          metadata: {
            thread_id: this.threadId,
            timestamp: new Date().toISOString(),
            memory_type: 'conversation'
          }
        });

      if (error) throw error;
      console.log('Memory stored successfully:', { roleId: this.roleId, content });
    } catch (error) {
      console.error('Error storing memory:', error);
      throw error;
    }
  }

  async retrieveMemories(limit: number = 10): Promise<RoleMemory[]> {
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