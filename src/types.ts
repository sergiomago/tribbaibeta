import { Tables } from "@/integrations/supabase/types";

export type Role = Tables<"roles">;

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