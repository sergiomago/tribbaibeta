export interface Message {
  id: string;
  thread_id: string;
  role_id: string | null;
  content: string;
  created_at: string;
  tagged_role_id: string | null;
  reply_to_message_id: string | null;
  response_order: number | null;
  chain_id: string | null;
  chain_order: number | null;
  role?: {
    name: string;
    tag: string;
  };
}

export interface Role {
  id: string;
  name: string;
  tag: string;
  description?: string;
  instructions: string;
  model: string;
  expertise_areas?: string[];
  special_capabilities?: string[];
  response_style?: Record<string, any>;
  interaction_preferences?: Record<string, any>;
}

export interface MessageContext {
  memories: Array<{
    id: string;
    content: string;
    similarity: number;
  }>;
  previousInteractions: Array<{
    id: string;
    initiator: { name: string };
    responder: { name: string };
  }>;
  conversationDepth: number;
  chainContext: {
    lastUpdated: string;
    contextType: string;
  };
}