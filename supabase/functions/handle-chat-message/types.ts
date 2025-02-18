
import { SupabaseClient } from '@supabase/supabase-js';

export interface MessageProcessor {
  supabase: SupabaseClient;
  threadId: string;
  content: string;
  messageId?: string;
  taggedRoleId?: string | null;
}

export interface MessageAnalysis {
  intent: string;
  topics: string[];
  sentiment: string;
  complexity: number;
}

export interface ContextData {
  threadId: string;
  roleId: string;
  content: string;
  analysis: MessageAnalysis;
}

export interface ResponseData {
  roleId: string;
  content: string;
  context: any;
  analysis: MessageAnalysis;
}

export interface RoleChainMember {
  role_id: string;
  order: number;
}
