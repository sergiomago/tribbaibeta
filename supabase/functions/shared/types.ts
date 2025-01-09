export interface Message {
  id: string;
  thread_id: string;
  role_id?: string;
  content: string;
  openai_message_id?: string;
  tagged_role_id?: string;
  reply_to_message_id?: string;
  chain_id?: string;
  chain_order?: number;
}

export interface Thread {
  id: string;
  user_id: string;
  name: string;
  openai_thread_id?: string;
}

export interface Role {
  id: string;
  name: string;
  instructions: string;
  assistant_id?: string;
}

export interface Memory {
  id: string;
  content: string;
  similarity: number;
}

export interface ConversationChainItem {
  role_id: string;
  chain_order: number;
}