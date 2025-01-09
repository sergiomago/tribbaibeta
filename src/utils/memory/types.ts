import { Json } from "@/integrations/supabase/types";

export interface MemoryMetadata extends Record<string, Json> {
  thread_id: string;
  timestamp: string;
  topic?: string;
  relevance_score?: number;
  interaction_count?: number;
  last_accessed?: string;
  context_length?: number;
  expires_at?: string;
  consolidated?: boolean;
  importance_score?: number;
}

export interface Memory {
  content: string;
  metadata: MemoryMetadata;
}