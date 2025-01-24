import { supabase } from '@/integrations/supabase/client';

interface MindCreationResponse {
  mindId: string;
  status: 'success' | 'error';
  message?: string;
}

interface ContextEnrichmentResponse {
  enrichedContext: string;
  metadata: {
    relevanceScore: number;
    confidenceScore: number;
    timestamp: number;
  };
}

interface MemoryRetrievalResponse {
  memories: Array<{
    id: string;
    content: string;
    relevance: number;
    timestamp: number;
  }>;
  metadata: {
    totalFound: number;
    avgRelevance: number;
  };
}

export class LlongtermClient {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = import.meta.env.VITE_LLONGTERM_API_KEY || '';
    this.baseUrl = 'https://api.llongterm.com/v1';
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit): Promise<T> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'API request failed');
      }

      return await response.json();
    } catch (error) {
      console.error(`Llongterm API error (${endpoint}):`, error);
      throw error;
    }
  }

  async createMind(roleId: string, instructions: string, metadata: Record<string, any> = {}): Promise<string> {
    try {
      const response = await this.makeRequest<MindCreationResponse>('/minds', {
        method: 'POST',
        body: JSON.stringify({
          instructions,
          metadata: {
            roleId,
            ...metadata
          }
        })
      });

      if (response.status === 'error') {
        throw new Error(response.message || 'Failed to create mind');
      }

      // Store mind association in our database
      const { error: dbError } = await supabase
        .from('role_minds')
        .insert({
          role_id: roleId,
          mind_id: response.mindId,
          status: 'active',
          metadata: metadata
        });

      if (dbError) {
        console.error('Error storing mind association:', dbError);
        throw dbError;
      }

      return response.mindId;
    } catch (error) {
      console.error('Error in createMind:', error);
      throw error;
    }
  }

  async enrichContext(mindId: string, context: string): Promise<ContextEnrichmentResponse> {
    try {
      return await this.makeRequest<ContextEnrichmentResponse>(`/minds/${mindId}/enrich`, {
        method: 'POST',
        body: JSON.stringify({ context })
      });
    } catch (error) {
      console.error('Error enriching context:', error);
      throw error;
    }
  }

  async getMindMemories(mindId: string, query: string): Promise<MemoryRetrievalResponse> {
    try {
      return await this.makeRequest<MemoryRetrievalResponse>(
        `/minds/${mindId}/memories?query=${encodeURIComponent(query)}`,
        { method: 'GET' }
      );
    } catch (error) {
      console.error('Error getting mind memories:', error);
      throw error;
    }
  }

  async updateMindStatus(roleId: string, status: 'active' | 'inactive' | 'error'): Promise<void> {
    try {
      const { error } = await supabase
        .from('role_minds')
        .update({ status })
        .eq('role_id', roleId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating mind status:', error);
      throw error;
    }
  }
}

export const llongtermClient = new LlongtermClient();