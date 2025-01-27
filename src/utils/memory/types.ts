export interface MemoryMetadata {
  timestamp: number;
  context_type: string;
  interaction_count: number;
  importance_score: number;
  consolidated: boolean;
  verification_count?: number;
  contradiction_count?: number;
  context_matches?: number;
  last_verification?: string;
  message_id?: string;
  verification_status?: 'verified' | 'partially_verified' | 'needs_verification' | 'contradicted';
  verification_score?: number;
}

export interface Memory {
  id: string;
  role_id: string;
  content: string;
  context_type: string;
  metadata: MemoryMetadata;
  embedding?: string;
  relevance_score?: number;
  confidence_score?: number;
  context_relevance?: number;
  verification_status?: string;
  verification_score?: number;
  last_verified?: string;
}

export const toJsonMetadata = (metadata: MemoryMetadata): Record<string, any> => {
  return {
    ...metadata,
    timestamp: metadata.timestamp || Date.now(),
    verification_count: metadata.verification_count || 0,
    contradiction_count: metadata.contradiction_count || 0,
    context_matches: metadata.context_matches || 0
  };
};

export const fromJsonMetadata = (json: Record<string, any>): MemoryMetadata => {
  return {
    timestamp: json.timestamp || Date.now(),
    context_type: json.context_type || 'conversation',
    interaction_count: json.interaction_count || 0,
    importance_score: json.importance_score || 0.5,
    consolidated: json.consolidated || false,
    verification_count: json.verification_count || 0,
    contradiction_count: json.contradiction_count || 0,
    context_matches: json.context_matches || 0,
    last_verification: json.last_verification,
    verification_status: json.verification_status,
    verification_score: json.verification_score,
    message_id: json.message_id
  };
};