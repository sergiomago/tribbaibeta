
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

  async getMind(mindId: string) {
    console.log('Getting mind:', mindId);
    
    try {
      const response = await fetch(`${BASE_URL}/minds/${mindId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${LLONGTERM_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.error('Failed to get mind:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Error details:', errorText);
        
        if (response.status === 404) {
          console.log('Mind not found, returning null');
          return null;
        }
        throw new Error(`Failed to get mind: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log('Mind retrieved successfully');
      
      return {
        id: mindId,
        async remember(messages: Message[]): Promise<RememberResponse> {
          console.log('Storing messages in mind:', messages);
          const rememberResponse = await fetch(`${BASE_URL}/minds/${mindId}/remember`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${LLONGTERM_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ messages })
          });

          if (!rememberResponse.ok) {
            const errorText = await rememberResponse.text();
            console.error('Failed to store memory:', rememberResponse.status, rememberResponse.statusText, errorText);
            throw new Error(`Failed to store memory: ${rememberResponse.status} ${rememberResponse.statusText} - ${errorText}`);
          }

          const result = await rememberResponse.json();
          console.log('Memory stored successfully:', result);
          return result;
        },
        async ask(question: string): Promise<KnowledgeResponse> {
          console.log('Querying mind with question:', question);
          const askResponse = await fetch(`${BASE_URL}/minds/${mindId}/ask`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${LLONGTERM_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ question })
          });

          if (!askResponse.ok) {
            const errorText = await askResponse.text();
            console.error('Failed to query mind:', askResponse.status, askResponse.statusText, errorText);
            throw new Error(`Failed to query mind: ${askResponse.status} ${askResponse.statusText} - ${errorText}`);
          }

          const result = await askResponse.json();
          console.log('Mind query successful:', result);
          return result;
        }
      };
    } catch (error) {
      console.error('Error in getMind:', error);
      throw error;
    }
  }

  async createMind(options: { specialism: string }) {
    console.log('Creating new mind with options:', options);
    
    try {
      if (!LLONGTERM_API_KEY) {
        throw new Error('LLONGTERM_API_KEY is not set');
      }

      const response = await fetch(`${BASE_URL}/minds`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LLONGTERM_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(options)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to create mind:', response.status, response.statusText, errorText);
        throw new Error(`Failed to create mind: ${response.status} ${response.statusText} - ${errorText}`);
      }

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
