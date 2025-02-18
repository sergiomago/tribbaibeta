
import { supabase } from "@/lib/supabase";

export class MemoryService {
  async storeMemory(roleId: string, content: string, metadata: Record<string, any> = {}) {
    const { error } = await supabase
      .from('role_memories')
      .insert({
        role_id: roleId,
        content,
        metadata,
        memory_type: 'conversation'
      });

    if (error) throw error;
  }

  async retrieveMemories(roleId: string, limit = 10) {
    const { data, error } = await supabase
      .from('role_memories')
      .select('*')
      .eq('role_id', roleId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }

  async getConversationContext(threadId: string, roleIds: string[]) {
    try {
      // Get recent messages from the thread
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (messagesError) throw messagesError;

      // Get relevant memories for the roles
      const { data: memories, error: memoriesError } = await supabase
        .from('role_memories')
        .select('*')
        .in('role_id', roleIds)
        .order('created_at', { ascending: false })
        .limit(5);

      if (memoriesError) throw memoriesError;

      return {
        recentMessages: messages || [],
        relevantMemories: memories || [],
        contextType: 'conversation',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting conversation context:', error);
      return {
        recentMessages: [],
        relevantMemories: [],
        contextType: 'conversation',
        timestamp: new Date().toISOString()
      };
    }
  }
}

export const memoryService = new MemoryService();
