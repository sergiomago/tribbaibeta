import { Json } from "@/integrations/supabase/types";

export interface MemoryMetadata {
  timestamp: number;
  source?: string;
  context?: string;
  interaction_count?: number;
  importance_score?: number;
  consolidated?: boolean;
  context_type?: string;
  expires_at?: string;
  last_accessed?: string;
  source_count?: number;
  source_ids?: string[];
  relevance_score?: number;
}

export interface Memory {
  id: string;
  content: string;
  metadata: MemoryMetadata;
  embedding?: number[];
  relevanceScore?: number;
}

export interface DatabaseMemory {
  id: string;
  role_id: string;
  content: string;
  embedding: string;
  context_type: string;
  metadata: Json;
  created_at: string;
  relevance_score?: number;
  last_accessed?: string;
  access_count?: number;
  context_relevance?: number;
  topic_vector?: string;
}

export type JsonMetadata = Json & MemoryMetadata;

// Helper functions for type conversion
export const toJsonMetadata = (metadata: MemoryMetadata): Json => {
  return metadata as Json;
};

export const fromJsonMetadata = (json: Json): MemoryMetadata => {
  return json as MemoryMetadata;
};