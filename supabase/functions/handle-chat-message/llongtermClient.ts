
import { LlongtermError } from "../../../src/lib/llongterm/errors.ts";
import type { CreateOptions, Mind, Message, RememberResponse, KnowledgeResponse } from '../../../src/types/llongterm.d.ts';

class LlongtermClient {
  private apiKey: string;
  private baseUrl: string;
  private static instance: LlongtermClient;

  private constructor() {
    this.apiKey = Deno.env.get('LLONGTERM_API_KEY') || '';
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

  async getMind(mindId: string): Promise<Mind | null> {
    try {
      return await this.request<Mind>(`/minds/${mindId}`, {
        method: 'GET',
      });
    } catch (error) {
      if (error instanceof LlongtermError && error.message.includes('not found')) {
        return null;
      }
      throw error;
    }
  }

  async createMind(options: CreateOptions): Promise<Mind> {
    return this.request<Mind>('/minds', {
      method: 'POST',
      body: JSON.stringify(options),
    });
  }
}

export const llongtermClient = LlongtermClient.getInstance();
