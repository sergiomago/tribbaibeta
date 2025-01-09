export interface MemoryMetadata {
  timestamp: number;
  source?: string;
  context?: string;
  relevance?: number;
  interaction_count?: number;
  importance_score?: number;
  consolidated?: boolean;
  context_type?: string;
  expires_at?: string;
  last_accessed?: string;
  source_count?: number;
  source_ids?: string[];
}

export type JsonMetadata = {
  [key: string]: any;
}

export interface Memory {
  id: string;
  content: string;
  metadata: MemoryMetadata;
  embedding?: number[];
  relevanceScore?: number;
}