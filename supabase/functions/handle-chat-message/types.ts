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

export interface Mind {
  id: string;
  memory: MemoryStructure;
  remember: (messages: Message[]) => Promise<RememberResponse>;
  ask: (question: string) => Promise<KnowledgeResponse>;
  kill: () => Promise<DeleteResponse>;
}

export interface Message {
  author: 'user' | 'assistant' | 'system';
  message: string;
  timestamp?: number;
  metadata?: Record<string, unknown>;
}

export interface CreateOptions {
  specialism?: string;
  specialismDepth?: number;
  initialMemory?: MemoryStructure;
  metadata?: Record<string, unknown>;
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

export interface ChatMessage {
  threadId: string;
  content: string;
  taggedRoleId?: string;
}

export interface ResponseChain {
  roleId: string;
  chainOrder: number;
}

export interface DomainAnalysis {
  name: string;
  confidence: number;
  requiredExpertise: string[];
}

export interface AnalysisResult {
  intent: string;
  domains: DomainAnalysis[];
  urgency: number;
}

export interface MessageContext {
  memories?: any[];
  previousInteractions?: any[];
  conversationDepth: number;
  chainContext: {
    lastUpdated: string;
    contextType: string;
  };
}

export interface MessageMemoryContext {
  used_memories?: string[];
  memory_id?: string;
  context_summary?: string;
}

export interface MessageMetadata {
  response_quality?: number;
  response_time?: number;
  role_performance?: number;
  memory_context?: MessageMemoryContext;
  [key: string]: any;
}

export interface Message {
  id: string;
  thread_id: string;
  role_id?: string | null;
  content: string;
  created_at: string;
  is_bot?: boolean;
  parent_message_id?: string | null;
  depth_level?: number;
  chain_position?: number;
  metadata?: MessageMetadata;
  role?: {
    name: string;
    expertise_areas?: string[];
  };
}
