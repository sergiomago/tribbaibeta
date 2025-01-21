import { Json } from "@/integrations/supabase/types";

export interface MemoryMetadata {
  timestamp: number;
  context_type?: string;
  memory_category?: string;
  source_type?: string;
  importance_score?: number;
  confidence_score?: number;
  context_relevance?: number;
  access_count?: number;
  last_accessed?: string;
  retrieval_count?: number;
  last_retrieved?: string;
  context_chain?: string[];
}

export interface Memory {
  id: string;
  content: string;
  metadata: MemoryMetadata;
  embedding?: string; // Changed from number[] to string to match DB
  relevance_score?: number;
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
  memory_category?: string;
  source_type?: string;
  retrieval_count?: number;
  last_retrieved?: string;
  context_chain?: string[];
  importance_score?: number;
  confidence_score?: number;
}