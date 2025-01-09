export interface MemoryMetadata {
  timestamp: number;
  source?: string;
  context?: string;
  relevance?: number;
  [key: string]: any; // Allow additional properties for flexibility
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