import { supabase } from "@/integrations/supabase/client";
import { Message } from "@/types";
import { createRoleSelector } from "../../roles/selection/RoleSelector";

export class RoleOrchestrator {
  private threadId: string;

  constructor(threadId: string) {
    this.threadId = threadId;
  }

  async handleMessage(content: string, taggedRoleId?: string | null): Promise<void> {
    console.log('Orchestrator handling message:', { content, taggedRoleId });

    try {
      // If a role is tagged, use just that role
      if (taggedRoleId) {
        console.log('Using tagged role:', taggedRoleId);
        const chain = [{ role_id: taggedRoleId }];
        await this.processMessageWithChain(content, chain);
        return;
      }

      // Otherwise use RoleSelector to get scored and ordered roles
      const roleSelector = createRoleSelector(this.threadId);
      const scoredRoles = await roleSelector.selectResponders(content);
      
      console.log('Scored and ordered roles:', scoredRoles);
      
      const chain = scoredRoles.map(role => ({
        role_id: role.id
      }));

      await this.processMessageWithChain(content, chain);

    } catch (error) {
      console.error('Error in orchestrator:', error);
      throw error;
    }
  }

  private async processMessageWithChain(content: string, chain: { role_id: string }[]) {
    console.log('Processing with chain:', chain);

    const { error } = await supabase.functions.invoke("handle-chat-message", {
      body: {
        threadId: this.threadId,
        content,
        chain
      },
    });

    if (error) throw error;
  }
}

export const createRoleOrchestrator = (threadId: string) => {
  return new RoleOrchestrator(threadId);
};
