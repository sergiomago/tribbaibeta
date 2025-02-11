
const LLONGTERM_API_KEY = Deno.env.get('LLONGTERM_API_KEY');
const BASE_URL = 'https://api.llongterm.com/v1';

interface Message {
  author: string;
  message: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface RememberResponse {
  success: boolean;
  memoryId: string;
  summary?: string;
}

interface KnowledgeResponse {
  answer: string;
  confidence: number;
  relevantMemories: string[];
}

class LlongtermClient {
  private static instance: LlongtermClient;
  
  private constructor() {
    if (!LLONGTERM_API_KEY) {
      throw new Error('LLONGTERM_API_KEY environment variable is not set');
    }
  }

  public static getInstance(): LlongtermClient {
    if (!LlongtermClient.instance) {
      LlongtermClient.instance = new LlongtermClient();
    }
    return LlongtermClient.instance;
  }

  private async makeRequest(endpoint: string, options: RequestInit) {
    const url = `${BASE_URL}${endpoint}`;
    console.log(`Making ${options.method} request to:`, url);

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${LLONGTERM_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Request failed: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`${response.status} ${response.statusText} - ${errorText}`);
    }

    return response;
  }

  async getMind(mindId: string) {
    console.log('Getting mind:', mindId);
    
    try {
      const response = await this.makeRequest(`/minds/${mindId}`, {
        method: 'GET',
      });

      const data = await response.json();
      console.log('Mind retrieved successfully');
      
      // Create a client instance for this mind
      const client = this;
      
      return {
        id: mindId,
        async remember(messages: Message[]): Promise<RememberResponse> {
          console.log('Storing messages in mind:', messages);
          const rememberResponse = await client.makeRequest(`/minds/${mindId}/remember`, {
            method: 'POST',
            body: JSON.stringify({ messages })
          });

          const result = await rememberResponse.json();
          console.log('Memory stored successfully:', result);
          return result;
        },
        async ask(question: string): Promise<KnowledgeResponse> {
          console.log('Querying mind with question:', question);
          const askResponse = await client.makeRequest(`/minds/${mindId}/ask`, {
            method: 'POST',
            body: JSON.stringify({ question })
          });

          const result = await askResponse.json();
          console.log('Mind query successful:', result);
          return result;
        }
      };
    } catch (error) {
      console.error('Error in getMind:', error);
      if (error.message.includes('404')) {
        console.log('Mind not found, returning null');
        return null;
      }
      throw error;
    }
  }

  async createMind(options: { specialism: string }) {
    console.log('Creating new mind with options:', options);
    
    try {
      if (!LLONGTERM_API_KEY) {
        throw new Error('LLONGTERM_API_KEY is not set');
      }

      const response = await this.makeRequest('/minds', {
        method: 'POST',
        body: JSON.stringify(options)
      });

      const data = await response.json();
      console.log('Mind created successfully:', data);
      return this.getMind(data.id);
    } catch (error) {
      console.error('Error in createMind:', error);
      throw error;
    }
  }
}

export const llongtermClient = LlongtermClient.getInstance();
