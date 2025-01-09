import { supabase } from "@/integrations/supabase/client";
import { createMemoryManager } from "./MemoryManager";
import { createLlongtermManager } from "./LlongtermManager";

export class RoleManager {
  private threadId: string;

  constructor(threadId: string) {
    this.threadId = threadId;
  }

  async getAssignedRoles() {
    const { data: threadRoles, error } = await supabase
      .from("thread_roles")
      .select("role_id")
      .eq("thread_id", this.threadId);

    if (error) throw error;
    return threadRoles.map(tr => tr.role_id);
  }

  async getNextRespondingRole(currentOrder: number) {
    const { data, error } = await supabase.rpc(
      'get_next_responding_role',
      { 
        thread_id: this.threadId,
        current_order: currentOrder 
      }
    );

    if (error) throw error;
    return data;
  }

  async getConversationChain(taggedRoleId?: string) {
    const { data, error } = await supabase.rpc(
      'get_conversation_chain',
      { 
        p_thread_id: this.threadId,
        p_tagged_role_id: taggedRoleId 
      }
    );

    if (error) throw error;
    return data;
  }

  async storeRoleMemory(roleId: string, content: string) {
    // Store in both systems for now
    const memoryManager = createMemoryManager(roleId, this.threadId);
    const llongtermManager = createLlongtermManager(roleId, this.threadId);
    
    await Promise.all([
      memoryManager.storeMemory(content),
      llongtermManager.storeMemory(content)
    ]);
  }

  async getRoleMemories(roleId: string, query: string, limit: number = 5) {
    const llongtermManager = createLlongtermManager(roleId, this.threadId);
    return await llongtermManager.retrieveRelevantMemories(query, limit);
  }
}

export const createRoleManager = (threadId: string) => {
  return new RoleManager(threadId);
};