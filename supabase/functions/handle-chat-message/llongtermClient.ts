const LLONGTERM_API_KEY = Deno.env.get('LLONGTERM_API_KEY') ?? '';
const BASE_URL = 'https://api.llongterm.com/v1';

interface Mind {
  id: string;
  remember: (messages: any[]) => Promise<any>;
  ask: (question: string) => Promise<any>;
}

interface MemoryResponse {
  memoryId?: string;
  relevantMemories?: string[];
  confidence?: number;
}

interface CreateMindOptions {
  specialism: string;
  specialismDepth?: number;
  initialMemory?: {
    summary: string;
    unstructured: Record<string, unknown>;
    structured: Record<string, unknown>;
  };
  metadata?: Record<string, unknown>;
}

class LlongtermClient {
  private static instance: LlongtermClient;
  
  private constructor() {
    // Validate API key on instantiation
    if (!LLONGTERM_API_KEY) {
      console.warn('Warning: LLONGTERM_API_KEY environment variable is not set');
    }
  }

  public static getInstance(): LlongtermClient {
    if (!LlongtermClient.instance) {
      LlongtermClient.instance = new LlongtermClient();
    }
    return LlongtermClient.instance;
  }

  private async makeRequest(endpoint: string, method: string, body?: any): Promise<Response> {
    const url = `${BASE_URL}${endpoint}`;
    console.log(`Making ${method} request to ${url}`);
    console.log('Request body:', JSON.stringify(body, null, 2));
    
    const headers = {
      'Authorization': `Bearer ${LLONGTERM_API_KEY}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'Tribbai/1.0'
    };

    const options: RequestInit = {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    };

    try {
      const response = await fetch(url, options);
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`${response.status} - ${errorText}`);
      }
      
      return response;
    } catch (error) {
      console.error('Request failed:', error);
      throw error;
    }
  }

  async createMind(options: CreateMindOptions): Promise<Mind> {
    try {
      if (!LLONGTERM_API_KEY) {
        throw new Error('LLONGTERM_API_KEY environment variable is not set');
      }

      console.log('Creating mind with options:', {
        ...options,
        metadata: options.metadata 
      });

      const response = await this.makeRequest('/minds', 'POST', {
        ...options,
        settings: {
          response_format: 'json',
          model: 'gpt-4'
        }
      });

      const data = await response.json();
      console.log('Mind created successfully:', data);
      
      return {
        id: data.id,
        async remember(messages: any[]): Promise<MemoryResponse> {
          const rememberResponse = await fetch(`${BASE_URL}/minds/${data.id}/remember`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${LLONGTERM_API_KEY}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({ messages })
          });

          if (!rememberResponse.ok) {
            console.error(`Failed to store memory: ${rememberResponse.statusText}`);
            throw new Error(`Failed to store memory: ${rememberResponse.statusText}`);
          }

          return rememberResponse.json();
        },
        
        async ask(question: string): Promise<MemoryResponse> {
          const askResponse = await fetch(`${BASE_URL}/minds/${data.id}/ask`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${LLONGTERM_API_KEY}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({ question })
          });

          if (!askResponse.ok) {
            console.error(`Failed to query mind: ${askResponse.statusText}`);
            throw new Error(`Failed to query mind: ${askResponse.statusText}`);
          }

          return askResponse.json();
        }
      };
    } catch (error) {
      console.error('Error in createMind:', error);
      throw error;
    }
  }

  async getMind(mindId: string): Promise<Mind | null> {
    try {
      if (!LLONGTERM_API_KEY) {
        console.error('LLONGTERM_API_KEY is not set in environment');
        return null;
      }

      const response = await this.makeRequest(`/minds/${mindId}`, 'GET');
      const data = await response.json();
      
      return {
        id: mindId,
        async remember(messages: any[]): Promise<MemoryResponse> {
          console.log(`Storing memory for mind ${mindId}`, messages);
          
          const rememberResponse = await fetch(`${BASE_URL}/minds/${mindId}/remember`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${LLONGTERM_API_KEY}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({ messages })
          });

          if (!rememberResponse.ok) {
            console.error(`Failed to store memory: ${rememberResponse.statusText}`);
            throw new Error(`Failed to store memory: ${rememberResponse.statusText}`);
          }

          return rememberResponse.json();
        },
        
        async ask(question: string): Promise<MemoryResponse> {
          console.log(`Querying mind ${mindId}`, { question });
          
          const askResponse = await fetch(`${BASE_URL}/minds/${mindId}/ask`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${LLONGTERM_API_KEY}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({ question })
          });

          if (!askResponse.ok) {
            console.error(`Failed to query mind: ${askResponse.statusText}`);
            throw new Error(`Failed to query mind: ${askResponse.statusText}`);
          }

          return askResponse.json();
        }
      };
    } catch (error) {
      console.error('Error in getMind:', error);
      return null;
    }
  }
}

export const llongtermClient = LlongtermClient.getInstance();
