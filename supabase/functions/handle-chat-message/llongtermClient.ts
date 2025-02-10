
import { LlongtermError } from "./errors.ts";
import type { CreateOptions, Mind, Message, RememberResponse, KnowledgeResponse } from './types.ts';

class LlongtermClient {
  private apiKey: string;
  private baseUrl: string;
  private static instance: LlongtermClient;

  private constructor() {
    this.apiKey = Deno.env.get('LLONGTERM_API_KEY') || '';
    this.baseUrl = 'https://api.llongterm.com/v1';
    
    if (!this.apiKey) {
      console.error('LLONGTERM_API_KEY is not set in environment variables');
    }
  }

  public static getInstance(): LlongtermClient {
    if (!LlongtermClient.instance) {
      LlongtermClient.instance = new LlongtermClient();
    }
    return LlongtermClient.instance;
  }

  private async request<T>(endpoint: string, options: RequestInit): Promise<T> {
    if (!this.apiKey) {
      throw new LlongtermError('LLONGTERM_API_KEY is not set');
    }

    const url = `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    console.log(`Making request to ${url}`);
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API request failed:', {
          status: response.status,
          statusText: response.statusText,
          errorBody: errorText,
          url: url
        });
        
        if (response.status === 404) {
          return null as T;
        }
        
        throw new LlongtermError(
          `API request failed (${response.status} ${response.statusText}): ${errorText}`
        );
      }

      const data = await response.json();
      console.log(`Successfully received response from ${endpoint}:`, data);
      return data;
    } catch (error) {
      console.error(`Request to ${endpoint} failed:`, error);
      if (error instanceof LlongtermError) {
        throw error;
      }
      throw new LlongtermError(`API request failed: ${error.message}`);
    }
  }

  async getMind(mindId: string): Promise<Mind | null> {
    try {
      console.log(`Attempting to get mind with ID: ${mindId}`);
      const response = await this.request<Mind>(`/minds/${mindId}`, {
        method: 'GET',
      });
      
      if (!response) {
        console.log(`Mind ${mindId} not found, returning null`);
        return null;
      }
      
      return response;
    } catch (error) {
      if (error instanceof LlongtermError && error.message.includes('not found')) {
        console.log(`Mind ${mindId} not found, returning null`);
        return null;
      }
      console.error(`Error getting mind ${mindId}:`, error);
      throw error;
    }
  }

  async createMind(options: CreateOptions): Promise<Mind> {
    console.log('Creating new mind with options:', options);
    return this.request<Mind>('/minds', {
      method: 'POST',
      body: JSON.stringify(options),
    });
  }
}

export const llongtermClient = LlongtermClient.getInstance();
