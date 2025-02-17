
declare module 'llongterm' {
  export interface CreateOptions {
    specialism?: string;
    specialismDepth?: number;
    metadata?: Record<string, unknown>;
  }

  export interface Mind {
    id: string;
    memory?: MemoryStructure;
    remember: (messages: Message[]) => Promise<RememberResponse>;
    ask: (question: string) => Promise<KnowledgeResponse>;
    kill: () => Promise<DeleteResponse>;
  }

  export interface Message {
    author: 'user' | 'assistant' | 'system';
    message: string;
    metadata?: Record<string, unknown>;
  }

  export interface MemorySection {
    content: string;
    timestamp: number;
    metadata?: Record<string, unknown>;
  }

  export interface MemoryStructure {
    summary: string;
    unstructured: Record<string, unknown>;
    structured: Record<string, MemorySection>;
  }

  export interface RememberResponse {
    success: boolean;
    memoryId: string;
    summary?: string;
  }

  export interface KnowledgeResponse {
    answer: string;
    confidence: number;
    relevantMemories: string[];
  }

  export interface DeleteResponse {
    success: boolean;
    mindId: string;
  }

  export interface LlongtermClient {
    minds: {
      create: (options: CreateOptions) => Promise<Mind>;
      get: (mindId: string) => Promise<Mind>;
      delete: (mindId: string) => Promise<DeleteResponse>;
    }
  }

  // Allow both default and named exports
  const factory: (config: { apiKey: string }) => LlongtermClient;
  export default factory;
  export = factory;
}
