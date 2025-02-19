
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
      let chain;
      
      if (taggedRoleId) {
        // If a role is tagged, get just that role
        const { data: role, error } = await supabase
          .from('roles')
          .select('*')
          .eq('id', taggedRoleId)
          .single();
          
        if (error) throw error;
        chain = [{ role_id: role.id, order: 1 }];
      } else {
        // Get the conversation chain from the database
        const { data: orderedChain, error } = await supabase
          .rpc('get_conversation_chain', { 
            p_thread_id: this.threadId,
            p_tagged_role_id: null 
          });

        if (error) {
          console.error('Error getting conversation chain:', error);
          // Fallback to role selector if chain retrieval fails
          chain = await this.buildRelevanceChain(content);
        } else {
          chain = orderedChain;
        }
      }

      console.log('Processing with chain:', chain);

      // Process message through edge function with ordered chain
      const { data: response, error: fnError } = await supabase.functions.invoke(
        'handle-chat-message',
        {
          body: { 
            threadId: this.threadId, 
            content,
            chain,
            taggedRoleId 
          }
        }
      );

      if (fnError) {
        console.error('Error invoking edge function:', fnError);
        throw fnError;
      }

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

    // Convert to chain format with order
    return relevantRoles.map((role, index) => ({
      role_id: role.id,
      order: index + 1
    }));
  }
}

export const createRoleOrchestrator = (threadId: string) => {
  return new RoleOrchestrator(threadId);
};
