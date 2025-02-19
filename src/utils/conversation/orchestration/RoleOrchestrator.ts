
import { supabase } from "@/integrations/supabase/client";
import { Role } from "@/types";
import { createRoleSelector } from "../../roles/selection/RoleSelector";

export class RoleOrchestrator {
  private threadId: string;

  constructor(threadId: string) {
    this.threadId = threadId;
  }

  async handleMessage(content: string, taggedRoleId?: string | null): Promise<void> {
    console.log('Orchestrator handling message:', { content, taggedRoleId });

    try {
      // Get roles in the thread
      const { data: threadRoles, error: rolesError } = await supabase
        .from('thread_roles')
        .select('role:roles(*)')
        .eq('thread_id', this.threadId);

      if (rolesError) throw rolesError;

      let chain;
      if (taggedRoleId) {
        chain = threadRoles
          .filter(tr => tr.role.id === taggedRoleId)
          .map(tr => ({
            role_id: tr.role.id,
            order: 1
          }));
      } else {
        // Get roles ordered by relevance
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

      console.log('Processing with chain:', chain);

      // Process message through edge function
      const { error: fnError } = await supabase.functions.invoke(
        'handle-chat-message',
        {
          body: JSON.stringify({ 
            threadId: this.threadId, 
            content,
            chain,
            taggedRoleId 
          })
        }
      );

      if (fnError) throw fnError;

    } catch (error) {
      console.error('Error in orchestrator:', error);
      throw error;
    }
  }
}

export const createRoleOrchestrator = (threadId: string) => {
  return new RoleOrchestrator(threadId);
};
