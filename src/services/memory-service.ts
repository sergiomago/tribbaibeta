
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
}

export const memoryService = new MemoryService();
