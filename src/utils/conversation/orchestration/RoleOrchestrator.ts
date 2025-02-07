import { supabase } from "@/integrations/supabase/client";
import { Message } from "@/types";

export class RoleOrchestrator {
  private threadId: string;

  constructor(threadId: string) {
    this.threadId = threadId;
  }

  async handleMessage(content: string, taggedRoleId?: string | null): Promise<void> {
    console.log('Orchestrator handling message:', { content, taggedRoleId });

    try {
      // Simple message handling - either use tagged role or get chain
      const chain = taggedRoleId 
        ? [{ role_id: taggedRoleId }]
        : await this.getSimpleChain();

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

  private async getSimpleChain() {
    const { data: threadRoles } = await supabase
      .from('thread_roles')
      .select('role_id')
      .eq('thread_id', this.threadId)
      .order('created_at', { ascending: true });

    return threadRoles || [];
  }
}

export const createRoleOrchestrator = (threadId: string) => {
  return new RoleOrchestrator(threadId);
};