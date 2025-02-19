
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
        .select(`
          role:roles (
            id,
            name,
            instructions,
            model
          )
        `)
        .eq('thread_id', this.threadId);

      if (rolesError) throw rolesError;

      // Create chain based on tagged role or all roles
      const chain = taggedRoleId 
        ? threadRoles.filter(tr => tr.role.id === taggedRoleId)
        : threadRoles;

      if (!chain.length) {
        throw new Error('No roles available to respond');
      }

      // Process through edge function
      const { error: fnError } = await supabase.functions.invoke(
        'handle-chat-message',
        {
          body: { 
            threadId: this.threadId, 
            content,
            roles: chain.map(tr => tr.role)
          }
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
