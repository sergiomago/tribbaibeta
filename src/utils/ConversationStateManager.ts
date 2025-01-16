import { supabase } from "@/integrations/supabase/client";

export type ConversationState = 'initial_analysis' | 'role_selection' | 'response_generation' | 'chain_processing' | 'completion';

export class ConversationStateManager {
  private threadId: string;

  constructor(threadId: string) {
    this.threadId = threadId;
  }

  async initialize() {
    const { data: existingState, error: checkError } = await supabase
      .from('conversation_states')
      .select('*')
      .eq('thread_id', this.threadId)
      .maybeSingle();

    if (checkError) throw checkError;

    if (!existingState) {
      const { error: createError } = await supabase
        .from('conversation_states')
        .insert({
          thread_id: this.threadId,
          current_state: 'initial_analysis',
          active_roles: [],
          metadata: {}
        });

      if (createError) throw createError;
    }
  }

  async getCurrentState(): Promise<ConversationState> {
    const { data, error } = await supabase
      .from('conversation_states')
      .select('current_state')
      .eq('thread_id', this.threadId)
      .single();

    if (error) throw error;
    return data.current_state;
  }

  async updateState(newState: ConversationState, metadata: Record<string, any> = {}) {
    const { error } = await supabase
      .from('conversation_states')
      .update({
        current_state: newState,
        metadata: {
          ...metadata,
          last_updated: new Date().toISOString(),
        }
      })
      .eq('thread_id', this.threadId);

    if (error) throw error;
  }

  async setActiveRoles(roleIds: string[]) {
    const { error } = await supabase
      .from('conversation_states')
      .update({
        active_roles: roleIds,
      })
      .eq('thread_id', this.threadId);

    if (error) throw error;
  }

  async recordRoleInteraction(initiatorRoleId: string, responderRoleId: string, type: string, relevanceScore: number = 0) {
    const { error } = await supabase
      .from('role_interactions')
      .insert({
        thread_id: this.threadId,
        initiator_role_id: initiatorRoleId,
        responder_role_id: responderRoleId,
        interaction_type: type,
        relevance_score: relevanceScore,
      });

    if (error) throw error;
  }
}

export const createConversationStateManager = (threadId: string) => {
  return new ConversationStateManager(threadId);
};