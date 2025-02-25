
import { supabase } from "@/integrations/supabase/client";
import { RelevanceScorer } from "../../roles/selection/RelevanceScoring";
import { ConversationStore } from "../store/ConversationStore";

interface Role {
  id: string;
  name: string;
  instructions: string;
  tag: string;
  model: string;
  expertise_areas: string[];
  primary_topics: string[];
}

interface ConversationMessage {
  role: string;
  content: string;
  role_name?: string;
}

export class RoleOrchestrator {
  private threadId: string;
  private relevanceScorer: RelevanceScorer;
  private roles: Role[] = [];

  constructor(threadId: string) {
    this.threadId = threadId;
    this.relevanceScorer = new RelevanceScorer();
  }

  private async loadRoles(): Promise<void> {
    const { data: threadRolesData } = await supabase
      .from('thread_roles')
      .select('role_id')
      .eq('thread_id', this.threadId);

    if (!threadRolesData?.length) throw new Error('No roles found');

    const roleIds = threadRolesData.map(tr => tr.role_id);

    const { data: rolesData } = await supabase
      .from('roles')
      .select('*')
      .in('id', roleIds);

    if (!rolesData?.length) throw new Error('No roles found');
    this.roles = rolesData;
  }

  private extractTaggedRole(message: string): string | null {
    for (const role of this.roles) {
      const tagPattern = new RegExp(`@${role.tag}\\b`, 'i');
      if (tagPattern.test(message)) {
        return role.id;
      }
    }
    return null;
  }

  private async generateRoleResponse(role: Role, message: string, previousResponses: ConversationMessage[], lastAiResponse?: string) {
    // Save thinking message
    const thinkingMessage = await ConversationStore.saveMessage(
      this.threadId,
      '...',
      role.id
    );

    try {
      // Get role's memories
      const memories = await ConversationStore.getRoleMemoriesFromThread(role.id, this.threadId);

      const { error: fnError } = await supabase.functions.invoke('handle-chat-message', {
        body: JSON.stringify({
          threadId: this.threadId,
          content: message,
          role,
          previousResponses,
          memories,
          lastAiResponse,
          messageId: thinkingMessage.id
        })
      });

      if (fnError) {
        console.error('Edge function error:', fnError);
        throw fnError;
      }

    } catch (error: any) {
      console.error('Error generating response:', error);
      
      // Update thinking message with error
      await supabase
        .from('messages')
        .update({
          content: 'Failed to generate response.',
          metadata: {
            error: error.message,
            streaming: false
          }
        })
        .eq('id', thinkingMessage.id);

      throw error;
    }
  }

  async handleMessage(content: string, taggedRoleId?: string | null): Promise<void> {
    try {
      await this.loadRoles();

      const taggedRole = taggedRoleId || this.extractTaggedRole(content);
      const messages = await ConversationStore.getMessages(this.threadId);
      const conversation = messages.map(msg => ({
        role: msg.role_id ? 'assistant' : 'user',
        content: msg.content,
        role_name: this.roles.find(r => r.id === msg.role_id)?.name
      }));

      // Save user message
      await ConversationStore.saveMessage(this.threadId, content, null);

      if (taggedRole) {
        // Handle tagged role response
        const role = this.roles.find(r => r.id === taggedRole);
        if (!role) throw new Error('Tagged role not found');

        await this.generateRoleResponse(role, content, conversation);
      } else {
        // Handle orchestrated responses
        let lastResponse = content;
        for (const role of this.roles) {
          try {
            await this.generateRoleResponse(role, content, conversation, lastResponse);
            
            // Get the latest response from this role to pass to next role
            const latestMessages = await ConversationStore.getMessages(this.threadId);
            const roleResponse = latestMessages
              .filter(m => m.role_id === role.id)
              .pop();
              
            if (roleResponse) {
              lastResponse = roleResponse.content;
            }

            // Give time for the previous message to be processed
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (error) {
            console.error(`Error processing role ${role.name}:`, error);
            continue;
          }
        }
      }
    } catch (error) {
      console.error('Error in orchestrator:', error);
      throw error;
    }
  }
}

export const createRoleOrchestrator = (threadId: string) => {
  return new RoleOrchestrator(threadId);
};
