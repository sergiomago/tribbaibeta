export type ConversationState = 'initial_analysis' | 'role_selection' | 'response_generation' | 'chain_processing' | 'completion';

export type ConversationStateData = {
  id: string;
  threadId: string;
  currentState: ConversationState;
  activeRoles: string[];
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
};

export type StateTransition = {
  from: ConversationState;
  to: ConversationState;
  condition?: () => boolean;
};

export type StateValidationError = {
  code: string;
  message: string;
  details?: Record<string, any>;
};