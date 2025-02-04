import { supabase } from "@/integrations/supabase/client";
import { ConversationState, StateValidationError } from "../types/conversation";
import { StateValidator } from "./StateValidation";

export class StateTransitionManager {
  private threadId: string;

  constructor(threadId: string) {
    this.threadId = threadId;
  }

  async transition(to: ConversationState): Promise<{ success: boolean; error?: StateValidationError }> {
    try {
      // Get current state
      const { data: currentData, error: fetchError } = await supabase
        .from('conversation_states')
        .select('current_state')
        .eq('thread_id', this.threadId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      const currentState = currentData?.current_state as ConversationState;
      
      // Validate transition
      const validationError = StateValidator.validateTransition(currentState, to);
      if (validationError) {
        return { success: false, error: validationError };
      }

      // Perform transition
      const { error: updateError } = await supabase
        .from('conversation_states')
        .update({ current_state: to })
        .eq('thread_id', this.threadId);

      if (updateError) throw updateError;

      return { success: true };
    } catch (error) {
      console.error('State transition failed:', error);
      return {
        success: false,
        error: {
          code: 'TRANSITION_FAILED',
          message: 'Failed to perform state transition',
          details: { error },
        },
      };
    }
  }
}