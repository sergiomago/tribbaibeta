
export type MessageMetadata = {
  message_id?: string;
  verification_status?: 'verified' | 'partially_verified' | 'needs_verification' | 'contradicted';
  verification_score?: number;
  [key: string]: any;
};

export type Message = {
  id: string;
  thread_id: string;
  role_id: string | null;
  content: string;
  created_at: string;
  tagged_role_id: string | null;
  role?: {
    name: string;
    tag: string;
    special_capabilities?: string[];
  };
  metadata?: MessageMetadata;
  depth_level?: number;
  parent_message_id?: string | null;
  chain_position?: number;
  chain_id?: string;
  chain_order?: number;
};
