
import { supabase } from "@/integrations/supabase/client";
import { createRoleSelector } from "../../roles/selection/RoleSelector";

export class RoleOrchestrator {
  private threadId: string;

  constructor(threadId: string) {
    this.threadId = threadId;
  }

  async handleMessage(content: string, taggedRoleId?: string | null): Promise<void> {
    try {
      // Get thread roles
      const { data: threadRoles, error: rolesError } = await supabase
        .from('thread_roles')
        .select('role:roles(*)')
        .eq('thread_id', this.threadId);

      if (rolesError) throw rolesError;

      // Determine response chain
      let chain;
      if (taggedRoleId) {
        // If role is tagged, only that role responds
        chain = [{ role_id: taggedRoleId, order: 1 }];
      } else {
        // Get optimal response order based on message content
        const roleSelector = createRoleSelector(this.threadId);
        const relevantRoles = await roleSelector.selectResponders(content);
        chain = relevantRoles.map((role, index) => ({
          role_id: role.id,
          order: index + 1
        }));
      }

      if (!chain.length) {
        throw new Error('No roles available to respond');
      }

      // Process through edge function
      await supabase.functions.invoke('handle-chat-message', {
        body: { threadId: this.threadId, content, chain }
      });

    } catch (error) {
      console.error('Error in orchestrator:', error);
      throw error;
    }
  }
}

export const createRoleOrchestrator = (threadId: string) => {
  return new RoleOrchestrator(threadId);
};
