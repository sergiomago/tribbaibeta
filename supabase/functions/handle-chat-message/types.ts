export interface ChatMessage {
  threadId: string;
  content: string;
  taggedRoleId?: string;
  metadata?: Record<string, any>;
}

export interface ResponseChain {
  roleId: string;
  chainOrder: number;
  messageId?: string;
}

export interface AnalysisResult {
  intent: string;
  context: string;
  specialRequirements?: string[];
  suggestedRoles?: string[];
}

export interface MessageContext {
  memories: any[];
  previousInteractions: any[];
  conversationDepth: number;
  chainContext?: Record<string, any>;
}