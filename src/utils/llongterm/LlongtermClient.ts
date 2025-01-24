import { supabase } from '@/integrations/supabase/client';

export class LlongtermClient {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = import.meta.env.VITE_LLONGTERM_API_KEY || '';
    this.baseUrl = 'https://api.llongterm.com/v1';
  }

  async createMind(roleId: string, instructions: string, metadata: any = {}) {
    try {
      const response = await fetch(`${this.baseUrl}/minds`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instructions,
          metadata: {
            roleId,
            ...metadata
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create mind');
      }

      const data = await response.json();
      
      // Store mind association in our database
      await supabase
        .from('role_minds')
        .insert({
          role_id: roleId,
          mind_id: data.mindId,
          status: 'active',
          metadata: metadata
        });

      return data.mindId;
    } catch (error) {
      console.error('Error creating mind:', error);
      throw error;
    }
  }

  async enrichContext(mindId: string, context: string) {
    try {
      const response = await fetch(`${this.baseUrl}/minds/${mindId}/enrich`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ context })
      });

      if (!response.ok) {
        throw new Error('Failed to enrich context');
      }

      return await response.json();
    } catch (error) {
      console.error('Error enriching context:', error);
      throw error;
    }
  }

  async getMindMemories(mindId: string, query: string) {
    try {
      const response = await fetch(`${this.baseUrl}/minds/${mindId}/memories?query=${encodeURIComponent(query)}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        }
      });

      if (!response.ok) {
        throw new Error('Failed to get mind memories');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting mind memories:', error);
      throw error;
    }
  }
}

export const llongtermClient = new LlongtermClient();