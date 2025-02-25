
import { supabase } from "@/integrations/supabase/client";
import { RelevanceScorer } from "../../roles/selection/RelevanceScoring";
import { RoleScoringData } from "../../roles/types/roles";

type RoleWithScore = {
  role: RoleScoringData;
  score: number;
};

export class RoleOrchestrator {
  private threadId: string;
  private relevanceScorer: RelevanceScorer;

  constructor(threadId: string) {
    this.threadId = threadId;
    this.relevanceScorer = new RelevanceScorer();
  }

  private async scoreRoles(roles: Array<{ role: RoleScoringData }>, content: string): Promise<RoleWithScore[]> {
    const scoredRoles: RoleWithScore[] = [];
    
    for (const tr of roles) {
      const score = await this.relevanceScorer.calculateScore(tr.role, content, this.threadId);
      scoredRoles.push({ role: tr.role, score });
    }

    return scoredRoles.sort((a, b) => b.score - a.score);
  }

  async handleMessage(content: string, taggedRoleId?: string | null): Promise<void> {
    try {
      // Get thread roles with only needed fields
      const { data: threadRoles, error: rolesError } = await supabase
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

      let selectedRoles: RoleScoringData[] = [];
      
      if (taggedRoleId) {
        selectedRoles = threadRoles
          .filter(tr => tr.role.id === taggedRoleId)
          .map(tr => tr.role);
      } else {
        const scoredRoles = await this.scoreRoles(threadRoles, content);
        selectedRoles = scoredRoles.map(sr => sr.role);
      }

      if (!selectedRoles.length) {
        throw new Error('No roles available to respond');
      }

      // Process roles sequentially
      for (const currentRole of selectedRoles) {
        // Create thinking message
        const { data: thinkingMessage, error: thinkingError } = await supabase
          .from('messages')
          .insert({
            thread_id: this.threadId,
            role_id: currentRole.id,
            content: '...',
            metadata: {
              role_name: currentRole.name,
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
          console.log(`Processing response for ${currentRole.name}`);
          
          // Get previous responses for context
          const { data: previousResponses } = await supabase
            .from('messages')
            .select('content, role_id, roles(name)')
            .eq('thread_id', this.threadId)
            .eq('metadata->streaming', false)
            .order('created_at', { ascending: true });

          // Process role response
          const { error: fnError } = await supabase.functions.invoke(
            'handle-chat-message',
            {
              body: { 
                threadId: this.threadId, 
                content,
                role: currentRole,
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

          // Wait for the response to be processed before continuing
          await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error) {
          console.error(`Error processing role ${currentRole.name}:`, error);
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
