
import { supabase } from "@/integrations/supabase/client";
import { RelevanceScorer } from "../../roles/selection/RelevanceScoring";
import { RoleScoringData } from "../../roles/types/roles";

// Explicitly match RoleScoringData structure
interface ThreadRole extends RoleScoringData {
  id: string;
  name: string;
  instructions: string;
  tag: string;
  model: string;
  expertise_areas: string[];
  primary_topics: string[];
}

interface DatabaseThreadRole {
  role: ThreadRole;
}

interface DatabaseMessage {
  content: string;
  role_id: string;
  role: {
    name: string;
  } | null;
}

export class RoleOrchestrator {
  private threadId: string;
  private relevanceScorer: RelevanceScorer;

  constructor(threadId: string) {
    this.threadId = threadId;
    this.relevanceScorer = new RelevanceScorer();
  }

  private async selectRoles(threadRoles: DatabaseThreadRole[], taggedRoleId?: string | null): Promise<ThreadRole[]> {
    if (!threadRoles?.length) return [];

    if (taggedRoleId) {
      return threadRoles
        .filter(tr => tr.role.id === taggedRoleId)
        .map(tr => tr.role);
    }

    const selectedRoles: ThreadRole[] = [];
    
    for (const tr of threadRoles) {
      const score = await this.relevanceScorer.calculateScore(
        tr.role,
        this.threadId,
        this.threadId
      );
      
      if (score > 0) {
        selectedRoles.push(tr.role);
      }
    }
    
    return selectedRoles;
  }

  async handleMessage(content: string, taggedRoleId?: string | null): Promise<void> {
    try {
      const { data, error: rolesError } = await supabase
        .from('thread_roles')
        .select(`
          role:roles (
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

      if (rolesError) throw rolesError;
      if (!data?.length) throw new Error('No roles found');

      const selectedRoles = await this.selectRoles(data as DatabaseThreadRole[], taggedRoleId);

      if (!selectedRoles.length) {
        throw new Error('No roles available to respond');
      }

      for (const role of selectedRoles) {
        const { data: thinkingMessage, error: thinkingError } = await supabase
          .from('messages')
          .insert({
            thread_id: this.threadId,
            role_id: role.id,
            content: '...',
            metadata: {
              role_name: role.name,
              streaming: true
            }
          })
          .select()
          .single();

        if (thinkingError) {
          console.error('Error creating thinking message:', thinkingError);
          continue;
        }

        try {
          console.log(`Processing response for ${role.name}`);
          
          // Simplified message query with proper role relationship
          const { data: messages } = await supabase
            .from('messages')
            .select(`
              content,
              role_id,
              role:roles (
                name
              )
            `)
            .eq('thread_id', this.threadId)
            .eq('metadata->streaming', false)
            .order('created_at', { ascending: true });

          const previousResponses = (messages || []).map(msg => ({
            content: msg.content,
            role_id: msg.role_id,
            role_name: msg.role?.name
          }));

          const { error: fnError } = await supabase.functions.invoke(
            'handle-chat-message',
            {
              body: { 
                threadId: this.threadId, 
                content,
                role,
                previousResponses,
                messageId: thinkingMessage.id
              }
            }
          );

          if (fnError) {
            console.error('Error in role response:', fnError);
            await supabase
              .from('messages')
              .update({
                content: 'Failed to generate response. Please try again.',
                metadata: {
                  error: fnError.message,
                  streaming: false
                }
              })
              .eq('id', thinkingMessage.id);
          }

          await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error: any) {
          console.error(`Error processing role ${role.name}:`, error);
          await supabase
            .from('messages')
            .update({
              content: 'Failed to generate response. Please try again.',
              metadata: {
                error: error.message,
                streaming: false
              }
            })
            .eq('id', thinkingMessage.id);
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
