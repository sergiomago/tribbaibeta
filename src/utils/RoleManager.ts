import { supabase } from "@/integrations/supabase/client";
import { createLlongtermManager } from "./LlongtermManager";

// Special role tags
const SPECIAL_ROLES = {
  WEB_SEARCHER: '@web',
  DOC_ANALYST: '@docanalyst'
} as const;

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

  async hasSpecialCapability(capability: keyof typeof SPECIAL_ROLES) {
    const { data: threadRoles, error } = await supabase
      .from("thread_roles")
      .select(`
        role:roles (
          tag
        )
      `)
      .eq("thread_id", this.threadId);

    if (error) throw error;

    return threadRoles.some(tr => tr.role?.tag === SPECIAL_ROLES[capability]);
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
    const llongtermManager = createLlongtermManager(roleId, this.threadId);
    await llongtermManager.storeMemory(content);
  }

  async getRoleMemories(roleId: string, content: string) {
    const llongtermManager = createLlongtermManager(roleId, this.threadId);
    return await llongtermManager.getMemories(content);
  }
}

export const createRoleManager = (threadId: string) => {
  return new RoleManager(threadId);
};