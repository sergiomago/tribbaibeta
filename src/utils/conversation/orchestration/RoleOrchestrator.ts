
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
      // If a specific role is tagged, use only that role
      const chain = taggedRoleId 
        ? [{ role_id: taggedRoleId }]
        : await this.buildRelevanceChain(content);

      console.log('Processing with chain:', chain);

      // Process message through edge function
      const { error } = await supabase.functions.invoke("handle-chat-message", {
        body: {
          threadId: this.threadId,
          content,
          chain,
          taggedRoleId
        },
      });

      if (error) throw error;

    } catch (error) {
      console.error('Error in orchestrator:', error);
      throw error;
    }
  }

  private async buildRelevanceChain(content: string) {
    // Create a role selector instance
    const roleSelector = createRoleSelector(this.threadId);
    
    // Get roles sorted by relevance to the message content
    const relevantRoles = await roleSelector.selectResponders(content);
    
    console.log('Relevant roles selected:', relevantRoles);

    // Convert to chain format
    return relevantRoles.map(role => ({
      role_id: role.id
    }));
  }
}

export const createRoleOrchestrator = (threadId: string) => {
  return new RoleOrchestrator(threadId);
};
