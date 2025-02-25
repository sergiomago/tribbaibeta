
import { supabase } from "@/integrations/supabase/client";
import { RelevanceScorer } from "../../roles/selection/RelevanceScoring";

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
    const { data, error } = await supabase
      .from('thread_roles')
      .select(`
        roles (
          id,
          name,
          instructions,
          tag,
          model,
          expertise_areas,
          primary_topics
        )
      `)
      .eq('thread_id', this.threadId);

    if (error) throw error;
    if (!data?.length) throw new Error('No roles found');

    this.roles = data.map(item => item.roles as Role);
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

  private async getConversationHistory(): Promise<ConversationMessage[]> {
    const { data: messages, error } = await supabase
      .from('messages')
      .select('content, role:roles(name), role_id')
      .eq('thread_id', this.threadId)
      .eq('metadata->streaming', false)
      .order('created_at', { ascending: true });

    if (error) throw error;
    
    return messages.map(msg => ({
      role: msg.role_id ? 'assistant' : 'user',
      content: msg.content,
      role_name: msg.role?.name
    }));
  }

  private async saveThinkingMessage(roleId: string, roleName: string) {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        thread_id: this.threadId,
        role_id: roleId,
        content: '...',
        metadata: {
          role_name: roleName,
          streaming: true
        }
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating thinking message:', error);
      throw error;
    }

    return data;
  }

  private async updateMessage(messageId: string, content: string, error?: string) {
    await supabase
      .from('messages')
      .update({
        content,
        metadata: {
          streaming: false,
          ...(error && { error })
        }
      })
      .eq('id', messageId);
  }

  private async generateRoleResponse(role: Role, message: string, conversation: ConversationMessage[]) {
    const { error: fnError } = await supabase.functions.invoke('handle-chat-message', {
      body: {
        threadId: this.threadId,
        content: message,
        role,
        previousResponses: conversation,
        roleId: role.id
      }
    });

    if (fnError) throw fnError;
  }

  async handleMessage(content: string, taggedRoleId?: string | null): Promise<void> {
    try {
      await this.loadRoles();

      const taggedRole = taggedRoleId || this.extractTaggedRole(content);
      const conversation = await this.getConversationHistory();

      if (taggedRole) {
        // Handle tagged role response
        const role = this.roles.find(r => r.id === taggedRole);
        if (!role) throw new Error('Tagged role not found');

        const thinkingMessage = await this.saveThinkingMessage(role.id, role.name);
        
        try {
          await this.generateRoleResponse(role, content, conversation);
        } catch (error: any) {
          await this.updateMessage(
            thinkingMessage.id,
            'Failed to generate response.',
            error.message
          );
        }
      } else {
        // Handle orchestrated responses
        for (const role of this.roles) {
          const thinkingMessage = await this.saveThinkingMessage(role.id, role.name);
          
          try {
            await this.generateRoleResponse(role, content, conversation);
          } catch (error: any) {
            await this.updateMessage(
              thinkingMessage.id,
              'Failed to generate response.',
              error.message
            );
          }

          // Give time for the previous message to be processed
          await new Promise(resolve => setTimeout(resolve, 1000));
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
