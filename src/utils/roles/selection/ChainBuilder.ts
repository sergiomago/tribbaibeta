import { Role } from "../types/roles";
import { supabase } from "@/integrations/supabase/client";

export class ChainBuilder {
  private threadId: string;

  constructor(threadId: string) {
    this.threadId = threadId;
  }

  async buildResponseChain(roles: Role[]): Promise<{ roleId: string; order: number }[]> {
    const { data: existingChain } = await supabase
      .rpc('get_conversation_chain', { 
        p_thread_id: this.threadId 
      });

    if (existingChain?.length) {
      return existingChain.map((item, index) => ({
        roleId: item.role_id,
        order: index + 1
      }));
    }

    // If no existing chain, create a new one
    return roles.map((role, index) => ({
      roleId: role.id,
      order: index + 1
    }));
  }

  async getNextResponder(currentOrder: number): Promise<string | null> {
    const { data: nextRoleId } = await supabase
      .rpc('get_next_responding_role', {
        thread_id: this.threadId,
        current_order: currentOrder
      });

    return nextRoleId;
  }
}

export const createChainBuilder = (threadId: string) => {
  return new ChainBuilder(threadId);
};