import { supabase } from "@/integrations/supabase/client";
import { ConversationState, ConversationStateData } from "../types/conversation";
import { StateTransitionManager } from "./StateTransitions";
import { StateValidator } from "./StateValidation";

export class ConversationStateManager {
  private threadId: string;
  private transitionManager: StateTransitionManager;

  constructor(threadId: string) {
    this.threadId = threadId;
    this.transitionManager = new StateTransitionManager(threadId);
  }

  async initialize(): Promise<void> {
    const { data: existingState } = await supabase
      .from('conversation_states')
      .select('*')
      .eq('thread_id', this.threadId)
      .maybeSingle();

    if (!existingState) {
      await supabase
        .from('conversation_states')
        .insert({
          thread_id: this.threadId,
          current_state: 'initial_analysis',
          active_roles: [],
          metadata: {}
        });
    }
  }

  async getCurrentState(): Promise<ConversationState | null> {
    const { data, error } = await supabase
      .from('conversation_states')
      .select('current_state')
      .eq('thread_id', this.threadId)
      .maybeSingle();

    if (error) throw error;
    return data?.current_state || null;
  }

  async updateState(newState: ConversationState): Promise<boolean> {
    const result = await this.transitionManager.transition(newState);
    return result.success;
  }

  async setActiveRoles(roleIds: string[]): Promise<void> {
    const { error } = await supabase
      .from('conversation_states')
      .update({ active_roles: roleIds })
      .eq('thread_id', this.threadId);

    if (error) throw error;
  }

  async getStateData(): Promise<ConversationStateData | null> {
    const { data, error } = await supabase
      .from('conversation_states')
      .select('*')
      .eq('thread_id', this.threadId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    // Transform snake_case to camelCase
    return {
      id: data.id,
      threadId: data.thread_id,
      currentState: data.current_state,
      activeRoles: data.active_roles,
      metadata: data.metadata,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  async updateMetadata(metadata: Record<string, any>): Promise<void> {
    const { error } = await supabase
      .from('conversation_states')
      .update({
        metadata: {
          ...metadata,
          last_updated: new Date().toISOString(),
        }
      })
      .eq('thread_id', this.threadId);

    if (error) throw error;
  }
}

export const createConversationStateManager = (threadId: string): ConversationStateManager => {
  return new ConversationStateManager(threadId);
};