export interface Memory {
  content: string;
  metadata: MemoryMetadata;
}

export interface MemoryMetadata {
  topic?: string;
  timestamp: string;
  expires_at?: string;
  importance_score?: number;
  consolidated?: boolean;
  interaction_count?: number;
  context_type?: string;
  relevance_score?: number;
}