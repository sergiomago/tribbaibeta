export interface AI_Role {
  id: string;
  name: string;
  description?: string;
  system_prompt?: string;
  instructions?: string;
  created_at: string;
  updated_at: string;
  embedding?: number[];
  last_used_at?: string;
};

export type Conversation = {
  id: string;
  user_id: string;
  title: string;
  is_team_chat: boolean;
  created_at: string;
  updated_at: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  role_id?: string;
  content: string;
  embedding?: number[];
  llongterm_memory_id?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
};
