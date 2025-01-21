import { ConversationState, StateTransition, StateValidationError } from "../types/conversation";

const VALID_TRANSITIONS: StateTransition[] = [
  { from: 'initial_analysis', to: 'role_selection' },
  { from: 'role_selection', to: 'response_generation' },
  { from: 'response_generation', to: 'chain_processing' },
  { from: 'chain_processing', to: 'completion' },
  { from: 'completion', to: 'initial_analysis' }, // Allow starting a new cycle
];

export class StateValidator {
  static validateTransition(from: ConversationState, to: ConversationState): StateValidationError | null {
    const transition = VALID_TRANSITIONS.find(t => t.from === from && t.to === to);
    
    if (!transition) {
      return {
        code: 'INVALID_TRANSITION',
        message: `Invalid state transition from ${from} to ${to}`,
      };
    }

    if (transition.condition && !transition.condition()) {
      return {
        code: 'TRANSITION_CONDITION_FAILED',
        message: 'Transition conditions not met',
      };
    }

    return null;
  }

  static isValidState(state: string): state is ConversationState {
    return ['initial_analysis', 'role_selection', 'response_generation', 'chain_processing', 'completion'].includes(state);
  }
}