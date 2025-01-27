export interface ChatMessage {
  threadId: string;
  content: string;
  taggedRoleId?: string;
}

export interface ResponseChain {
  roleId: string;
  chainOrder: number;
}

export interface AnalysisResult {
  intent: string;
  context: string;
  specialRequirements?: string[];
  suggestedRoles?: string[];
}

export interface MessageContext {
  memories?: any[];
  previousInteractions?: any[];
  conversationDepth: number;
  chainContext: {
    lastUpdated: string;
    contextType: string;
  };
}