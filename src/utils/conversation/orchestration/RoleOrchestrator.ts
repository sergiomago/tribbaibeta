
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
      // Send to edge function for processing with either tagged role or for full scoring
      const { error } = await supabase.functions.invoke("handle-chat-message", {
        body: {
          threadId: this.threadId,
          content,
          taggedRoleId
        },
      });

      if (error) throw error;

    } catch (error) {
      console.error('Error in orchestrator:', error);
      throw error;
    }
  }
}

export const createRoleOrchestrator = (threadId: string) => {
  return new RoleOrchestrator(threadId);
};
