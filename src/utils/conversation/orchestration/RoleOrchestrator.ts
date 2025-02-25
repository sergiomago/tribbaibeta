
import { supabase } from "@/integrations/supabase/client";
import { RelevanceScorer } from "../../roles/selection/RelevanceScoring";
import { RoleScoringData } from "../../roles/types/roles";

export class RoleOrchestrator {
  private threadId: string;
  private relevanceScorer: RelevanceScorer;

  constructor(threadId: string) {
    this.threadId = threadId;
    this.relevanceScorer = new RelevanceScorer();
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

      let chain = [];
      
      if (taggedRoleId) {
        chain = threadRoles.filter(tr => tr.role.id === taggedRoleId);
      } else {
        const scoredRoles = await Promise.all(
          threadRoles.map(async (tr) => ({
            ...tr,
            score: await this.relevanceScorer.calculateScore(tr.role as RoleScoringData, content, this.threadId)
          }))
        );

        chain = scoredRoles
          .sort((a, b) => b.score - a.score)
          .map(sr => ({ role: sr.role }));
      }

      if (!chain.length) {
        throw new Error('No roles available to respond');
      }

      // Get the highest existing chain_order
      const { data: latestMessage } = await supabase
        .from('messages')
        .select('chain_order')
        .eq('thread_id', this.threadId)
        .order('created_at', { ascending: false })
        .limit(1);

      const baseOrder = (latestMessage?.[0]?.chain_order || 0) + 1;

      // Create and process messages sequentially
      for (let i = 0; i < chain.length; i++) {
        const currentRole = chain[i].role;
        const currentOrder = baseOrder + i;

        // Create placeholder message
        const { data: placeholderMessage, error: placeholderError } = await supabase
          .from('messages')
          .insert({
            thread_id: this.threadId,
            role_id: currentRole.id,
            content: '...',
            chain_order: currentOrder,
            metadata: {
              role_name: currentRole.name,
              streaming: true
            }
          })
          .select()
          .single();

        if (placeholderError) {
          console.error('Error creating placeholder:', placeholderError);
          continue;
        }

        try {
          // Process role response
          const { error: fnError } = await supabase.functions.invoke(
            'handle-chat-message',
            {
              body: { 
                threadId: this.threadId, 
                content,
                role: currentRole,
                chain_order: currentOrder,
                messageId: placeholderMessage.id
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
              .eq('id', placeholderMessage.id);
          }
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
              .eq('id', placeholderMessage.id);
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
