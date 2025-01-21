export interface MessageContext {
  memories: any[];
  previousMessages: any[];
  conversationDepth: number;
  chainContext: {
    lastUpdated: string;
    contextType: string;
  };
}

export interface ResponseChain {
  roleId: string;
  chainOrder: number;
}