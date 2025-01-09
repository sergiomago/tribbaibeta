import { Json } from "@/integrations/supabase/types";

export interface Memory {
  content: string;
  metadata: MemoryMetadata;
}

export interface MemoryMetadata {
  topic?: string;
  timestamp: string;
  thread_id?: string;
  expires_at?: string;
  importance_score?: number;
  consolidated?: boolean;
  interaction_count?: number;
  context_type?: string;
  relevance_score?: number;
  last_accessed?: string;
  context_length?: number;
}

// Helper type for Supabase compatibility
export type JsonMetadata = Record<keyof MemoryMetadata, Json>;