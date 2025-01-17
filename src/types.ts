import { Tables } from "@/integrations/supabase/types";

export type Role = Tables<"roles">;

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

export type ConversationState = {
  id: string;
  thread_id: string;
  current_state: 'initial_analysis' | 'role_selection' | 'response_generation' | 'chain_processing' | 'completion';
  active_roles: string[];
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
};

export type RoleInteraction = {
  id: string;
  initiator_role_id: string;
  responder_role_id: string;
  thread_id: string;
  interaction_type: string;
  relevance_score: number;
  metadata: Record<string, any>;
  created_at: string;
};