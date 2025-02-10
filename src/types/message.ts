
export type MessageMetadata = {
  message_id?: string;
  verification_status?: 'verified' | 'partially_verified' | 'needs_verification' | 'contradicted';
  verification_score?: number;
  thread_context?: {
    depth: number;
    parent_id?: string;
    child_ids?: string[];
  };
  interaction_data?: {
    response_quality?: number;
    response_time?: number;
    role_performance?: number;
  };
  [key: string]: any;
};

export type Message = {
  id: string;
  thread_id: string;
  role_id: string | null;
  responding_role_id: string | null;
  content: string;
  created_at: string;
  is_bot: boolean;
  parent_message_id?: string | null;
  thread_depth: number;
  tagged_role_id: string | null;
  metadata?: MessageMetadata;
  role?: {
    name: string;
    tag: string;
  };
};

export type ThreadResponseOrder = {
  id: string;
  thread_id: string;
  role_id: string;
  response_position: number;
  created_at: string;
};
