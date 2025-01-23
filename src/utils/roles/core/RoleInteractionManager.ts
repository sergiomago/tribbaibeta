import { supabase } from "@/integrations/supabase/client";

export class RoleInteractionManager {
  private threadId: string;

  constructor(threadId: string) {
    this.threadId = threadId;
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
}

export const createRoleInteractionManager = (threadId: string) => {
  return new RoleInteractionManager(threadId);
};