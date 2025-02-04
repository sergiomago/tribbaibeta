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
  // First convert to unknown, then to Json to satisfy TypeScript
  return {
    timestamp: metadata.timestamp,
    source: metadata.source,
    context: metadata.context,
    interaction_count: metadata.interaction_count,
    importance_score: metadata.importance_score,
    consolidated: metadata.consolidated,
    context_type: metadata.context_type,
    expires_at: metadata.expires_at,
    last_accessed: metadata.last_accessed,
    source_count: metadata.source_count,
    source_ids: metadata.source_ids,
    relevance_score: metadata.relevance_score
  } as unknown as Json;
};

export const fromJsonMetadata = (json: Json): MemoryMetadata => {
  // First convert to unknown, then to MemoryMetadata to satisfy TypeScript
  const metadata = json as { [key: string]: Json };
  return {
    timestamp: metadata.timestamp as number,
    source: metadata.source as string | undefined,
    context: metadata.context as string | undefined,
    interaction_count: metadata.interaction_count as number | undefined,
    importance_score: metadata.importance_score as number | undefined,
    consolidated: metadata.consolidated as boolean | undefined,
    context_type: metadata.context_type as string | undefined,
    expires_at: metadata.expires_at as string | undefined,
    last_accessed: metadata.last_accessed as string | undefined,
    source_count: metadata.source_count as number | undefined,
    source_ids: metadata.source_ids as string[] | undefined,
    relevance_score: metadata.relevance_score as number | undefined
  };
};