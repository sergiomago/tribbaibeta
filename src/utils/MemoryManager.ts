import { supabase } from "@/integrations/supabase/client";

export class MemoryManager {
  private roleId: string;
  private threadId: string;

  constructor(roleId: string, threadId: string) {
    this.roleId = roleId;
    this.threadId = threadId;
  }

  async storeMemory(content: string, contextType: string = 'conversation') {
    try {
      const { error } = await supabase
        .from('messages_memory')
        .insert({
          role_id: this.roleId,
          thread_id: this.threadId,
          content,
          context_type: contextType
        });

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
        .from('messages_memory')
        .select('*')
        .eq('role_id', this.roleId)
        .eq('thread_id', this.threadId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error retrieving memories:', error);
      throw error;
    }
  }

  async clearMemories() {
    try {
      const { error } = await supabase
        .from('messages_memory')
        .delete()
        .eq('role_id', this.roleId)
        .eq('thread_id', this.threadId);

      if (error) throw error;
      console.log('Memories cleared successfully for role:', this.roleId);
    } catch (error) {
      console.error('Error clearing memories:', error);
      throw error;
    }
  }
}

export const createMemoryManager = (roleId: string, threadId: string) => {
  return new MemoryManager(roleId, threadId);
};