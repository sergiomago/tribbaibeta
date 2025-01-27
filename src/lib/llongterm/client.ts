import { LLONGTERM_API_KEY } from '@/config/secrets';

class LlongtermClient {
  private static instance: LlongtermClient;
  private apiKey: string;
  private baseUrl: string;

  private constructor() {
    this.apiKey = LLONGTERM_API_KEY;
    this.baseUrl = 'https://api.llongterm.com/v1';
  }

  public static getInstance(): LlongtermClient {
    if (!LlongtermClient.instance) {
      LlongtermClient.instance = new LlongtermClient();
    }
    return LlongtermClient.instance;
  }

  private async request<T>(endpoint: string, options: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new LlongtermError(`API request failed: ${response.statusText}`);
    }

    return response.json();
  }

  async createMind(options: CreateOptions): Promise<Mind> {
    return this.request<Mind>('/minds', {
      method: 'POST',
      body: JSON.stringify(options),
    });
  }

  async getMind(mindId: string): Promise<Mind> {
    return this.request<Mind>(`/minds/${mindId}`, {
      method: 'GET',
    });
  }

  async deleteMind(mindId: string): Promise<DeleteResponse> {
    return this.request<DeleteResponse>(`/minds/${mindId}`, {
      method: 'DELETE',
    });
  }
}

export const llongtermClient = LlongtermClient.getInstance();