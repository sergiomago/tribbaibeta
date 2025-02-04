import { supabase } from "@/integrations/supabase/client";
import { createLlongtermManager } from "./LlongtermManager";
import { createMemoryContextManager } from "./memory/contextManager";

// Special role capabilities
export const SPECIAL_CAPABILITIES = {
  WEB_SEARCH: 'web_search',
  DOC_ANALYSIS: 'doc_analysis'
} as const;

export type SpecialCapability = typeof SPECIAL_CAPABILITIES[keyof typeof SPECIAL_CAPABILITIES];

export class RoleManager {
  private threadId: string;
  private memoryContextManager: ReturnType<typeof createMemoryContextManager> | null = null;

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

  async hasSpecialCapability(capability: SpecialCapability) {
    const { data: threadRoles, error } = await supabase
      .from("thread_roles")
      .select(`
        role:roles (
          special_capabilities
        )
      `)
      .eq("thread_id", this.threadId);

    if (error) throw error;

    return threadRoles.some(tr => 
      tr.role?.special_capabilities?.includes(capability)
    );
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

  async getRoleCapabilities(roleId: string) {
    const { data, error } = await supabase
      .from("roles")
      .select("special_capabilities")
      .eq("id", roleId)
      .single();

    if (error) throw error;
    return data?.special_capabilities || [];
  }

  private getMemoryContextManager(roleId: string) {
    if (!this.memoryContextManager) {
      this.memoryContextManager = createMemoryContextManager(roleId);
    }
    return this.memoryContextManager;
  }

  async storeRoleMemory(roleId: string, content: string, contextType: string = 'conversation', metadata: any = {}) {
    const memoryManager = this.getMemoryContextManager(roleId);
    await memoryManager.storeMemoryWithContext(content, contextType, {
      ...metadata,
      thread_id: this.threadId
    });
  }

  async getRoleMemories(roleId: string, content: string) {
    const memoryManager = this.getMemoryContextManager(roleId);
    return await memoryManager.retrieveRelevantMemories(content);
  }

  async updateMemoryRelevance(roleId: string, memoryId: string, relevanceScore: number) {
    const memoryManager = this.getMemoryContextManager(roleId);
    await memoryManager.updateMemoryRelevance(memoryId, relevanceScore);
  }
}

export const createRoleManager = (threadId: string) => {
  return new RoleManager(threadId);
};