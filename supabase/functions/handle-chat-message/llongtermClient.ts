
const LLONGTERM_API_KEY = Deno.env.get('LLONGTERM_API_KEY');
const BASE_URL = 'https://api.llongterm.com/v1';

class LlongtermClient {
  private static instance: LlongtermClient;
  
  private constructor() {}

  public static getInstance(): LlongtermClient {
    if (!LlongtermClient.instance) {
      LlongtermClient.instance = new LlongtermClient();
    }
    return LlongtermClient.instance;
  }

  async getMind(mindId: string) {
    if (!LLONGTERM_API_KEY) {
      throw new Error('LLONGTERM_API_KEY is not set');
    }

    const response = await fetch(`${BASE_URL}/minds/${mindId}`, {
      headers: {
        'Authorization': `Bearer ${LLONGTERM_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to get mind: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      id: mindId,
      async remember(messages: any[]) {
        const rememberResponse = await fetch(`${BASE_URL}/minds/${mindId}/remember`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LLONGTERM_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ messages })
        });

        if (!rememberResponse.ok) {
          throw new Error(`Failed to store memory: ${rememberResponse.statusText}`);
        }

        return rememberResponse.json();
      },
      async ask(question: string) {
        const askResponse = await fetch(`${BASE_URL}/minds/${mindId}/ask`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LLONGTERM_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ question })
        });

        if (!askResponse.ok) {
          throw new Error(`Failed to query mind: ${askResponse.statusText}`);
        }

        return askResponse.json();
      }
    };
  }
}

export const llongtermClient = LlongtermClient.getInstance();
