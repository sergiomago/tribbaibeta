
import { LLONGTERM_API_KEY } from '@/config/secrets';
import { LlongtermError } from './errors';
import type { CreateOptions, Mind, DeleteResponse } from 'llongterm';

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

  async createMind(options: CreateOptions): Promise<Mind> {
    try {
      const response = await fetch(`${this.baseUrl}/minds`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          specialism: options.specialism || 'AI Assistant',
          specialismDepth: options.specialismDepth || 2,
          metadata: options.metadata,
          initialMemory: {
            summary: options.metadata?.description || '',
            structured: options.metadata?.structured || {},
            unstructured: options.metadata?.unstructured || {}
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new LlongtermError(`Failed to create mind: ${errorData}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to create mind:', error);
      throw error instanceof LlongtermError ? error : new LlongtermError(String(error));
    }
  }

  async getMind(mindId: string): Promise<Mind> {
    try {
      const response = await fetch(`${this.baseUrl}/minds/${mindId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new LlongtermError(`Failed to get mind: ${await response.text()}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get mind:', error);
      throw error instanceof LlongtermError ? error : new LlongtermError(String(error));
    }
  }

  async deleteMind(mindId: string): Promise<DeleteResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/minds/${mindId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new LlongtermError(`Failed to delete mind: ${await response.text()}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to delete mind:', error);
      throw error instanceof LlongtermError ? error : new LlongtermError(String(error));
    }
  }
}

export const llongtermClient = LlongtermClient.getInstance();
