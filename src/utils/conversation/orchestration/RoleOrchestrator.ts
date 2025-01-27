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
      // 1. If a role is tagged, only that role should respond
      if (taggedRoleId) {
        console.log('Tagged role detected:', taggedRoleId);
        await this.handleTaggedMessage(content, taggedRoleId);
        return;
      }

      // 2. For untagged messages, get conversation chain
      const { data: chain } = await supabase.rpc(
        'get_conversation_chain',
        { 
          p_thread_id: this.threadId,
          p_tagged_role_id: null
        }
      );

      console.log('Conversation chain:', chain);

      // 3. Process message through chain
      await this.processMessageThroughChain(content, chain);

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

  private async processMessageThroughChain(content: string, chain: any[]): Promise<void> {
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