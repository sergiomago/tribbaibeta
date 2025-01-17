import { Role } from "./role";

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
  reply_to_message_id: string | null;
  response_order: number | null;
  chain_id: string | null;
  chain_order: number | null;
  search_vector: unknown | null;
  metadata: MessageMetadata | null;
  message_type: 'text' | 'file' | 'analysis';
  role?: {
    name: string;
    tag: string;
  };
};