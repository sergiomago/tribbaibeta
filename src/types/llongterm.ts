export interface LlongtermMessage {
  author: string;
  message: string;
  timestamp?: string;
  metadata?: Record<string, any>;
}

export interface MindResponse {
  success: boolean;
  mindId: string;
  error?: string;
}

export interface MindQueryResponse {
  results: {
    content: string;
    relevance: number;
    timestamp: string;
  }[];
  metadata?: {
    totalResults: number;
    processingTime: number;
  };
}

export interface MindCreateOptions {
  specialism?: string;
  specialismDepth?: number;
  customStructuredKeys?: string[];
}

export interface Mind {
  remember(messages: LlongtermMessage[]): Promise<{ success: boolean }>;
  ask(question: string): Promise<MindQueryResponse>;
  kill(): Promise<{ success: boolean }>;
}

export interface LlongtermClient {
  create(options: MindCreateOptions): Promise<MindResponse>;
  getMind(mindId: string): Promise<Mind>;
}