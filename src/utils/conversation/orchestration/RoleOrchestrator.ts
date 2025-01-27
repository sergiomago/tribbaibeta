import { supabase } from "@/integrations/supabase/client";

export class RoleOrchestrator {
  private threadId: string;

  constructor(threadId: string) {
    this.threadId = threadId;
  }

  async handleMessage(content: string, taggedRoleId?: string | null): Promise<void> {
    console.log('Orchestrator handling message:', { content, taggedRoleId });

    try {
      // 1. If a role is tagged, only that role should respond
      if (taggedRoleId) {
        console.log('Tagged role detected:', taggedRoleId);
        await this.handleTaggedMessage(content, taggedRoleId);
        return;
      }

      // 2. For untagged messages, get thread roles in order
      const { data: threadRoles } = await supabase
        .from('thread_roles')
        .select('role_id')
        .eq('thread_id', this.threadId);

      if (!threadRoles?.length) {
        throw new Error('No roles found in thread');
      }

      console.log('Thread roles:', threadRoles);

      // 3. Process message through roles
      await this.processMessageThroughRoles(content, threadRoles);

    } catch (error) {
      console.error('Error in orchestrator:', error);
      throw error;
    }
  }

  private async handleTaggedMessage(content: string, taggedRoleId: string): Promise<void> {
    const { error } = await supabase.functions.invoke("handle-chat-message", {
      body: {
        threadId: this.threadId,
        content,
        taggedRoleId
      },
    });

    if (error) throw error;
  }

  private async processMessageThroughRoles(content: string, threadRoles: { role_id: string }[]): Promise<void> {
    const { error } = await supabase.functions.invoke("handle-chat-message", {
      body: {
        threadId: this.threadId,
        content,
        roles: threadRoles
      },
    });

    if (error) throw error;
  }
}

export const createRoleOrchestrator = (threadId: string) => {
  return new RoleOrchestrator(threadId);
};