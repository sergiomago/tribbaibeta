
const LLONGTERM_API_KEY = Deno.env.get('LLONGTERM_API_KEY');
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

class LlongtermClient {
  private static instance: LlongtermClient;
  
  private constructor() {}

  public static getInstance(): LlongtermClient {
    if (!LlongtermClient.instance) {
      LlongtermClient.instance = new LlongtermClient();
    }
    return LlongtermClient.instance;
  }

  async getMind(mindId: string): Promise<Mind | null> {
    try {
      if (!LLONGTERM_API_KEY) {
        console.error('LLONGTERM_API_KEY is not set');
        return null;
      }

      const response = await fetch(`${BASE_URL}/minds/${mindId}`, {
        headers: {
          'Authorization': `Bearer ${LLONGTERM_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          console.log(`Mind ${mindId} not found, will be created if needed`);
          return null;
        }
        throw new Error(`Failed to get mind: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        id: mindId,
        async remember(messages: any[]): Promise<MemoryResponse> {
          console.log(`Storing memory for mind ${mindId}`, messages);
          
          const rememberResponse = await fetch(`${BASE_URL}/minds/${mindId}/remember`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${LLONGTERM_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ messages })
          });

          if (!rememberResponse.ok) {
            console.error(`Failed to store memory: ${rememberResponse.statusText}`);
            return {};
          }

          return rememberResponse.json();
        },
        
        async ask(question: string): Promise<MemoryResponse> {
          console.log(`Querying mind ${mindId}`, { question });
          
          const askResponse = await fetch(`${BASE_URL}/minds/${mindId}/ask`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${LLONGTERM_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ question })
          });

          if (!askResponse.ok) {
            console.error(`Failed to query mind: ${askResponse.statusText}`);
            return {
              relevantMemories: [],
              confidence: 0
            };
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
