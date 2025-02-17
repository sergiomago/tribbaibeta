
import { supabase } from '@/integrations/supabase/client';
import { LlongtermError } from './errors';
import type { CreateOptions, Mind, DeleteResponse, Message, RememberResponse, KnowledgeResponse } from 'llongterm';

// Create a wrapper for Llongterm operations
class LlongtermMindClient {
  async create(options: CreateOptions): Promise<Mind> {
    try {
      const { data, error } = await supabase.functions.invoke('create-mind', {
        body: {
          specialism: options.specialism,
          specialismDepth: options.specialismDepth,
          metadata: options.metadata
        }
      });

      if (error) {
        throw new Error(`Failed to create mind: ${error.message}`);
      }

      // Return a Mind object with all required methods
      return this.createMindInstance(data.id);
    } catch (error) {
      console.error('Error creating mind:', error);
      throw new LlongtermError('Failed to create mind: ' + error.message);
    }
  }

  async get(mindId: string): Promise<Mind> {
    return this.createMindInstance(mindId);
  }

  async delete(mindId: string): Promise<DeleteResponse> {
    const { error } = await supabase.functions.invoke('delete-mind', {
      body: { mindId }
    });

    if (error) {
      throw new Error(`Failed to delete mind: ${error.message}`);
    }

    return {
      success: true,
      mindId
    };
  }

  private createMindInstance(mindId: string): Mind {
    return {
      id: mindId,
      async remember(messages: Message[]): Promise<RememberResponse> {
        const { data, error } = await supabase.functions.invoke('remember-mind', {
          body: { 
            mindId,
            messages 
          }
        });

        if (error) {
          throw new Error(`Failed to store memory: ${error.message}`);
        }

        return {
          success: true,
          memoryId: data.memoryId,
          summary: data.summary
        };
      },
      async ask(question: string): Promise<KnowledgeResponse> {
        const { data, error } = await supabase.functions.invoke('ask-mind', {
          body: { 
            mindId,
            question 
          }
        });

        if (error) {
          throw new Error(`Failed to get answer: ${error.message}`);
        }

        return {
          answer: data.answer,
          confidence: data.confidence,
          relevantMemories: data.relevantMemories
        };
      },
      async kill(): Promise<DeleteResponse> {
        const { error } = await supabase.functions.invoke('delete-mind', {
          body: { mindId }
        });

        if (error) {
          throw new Error(`Failed to delete mind: ${error.message}`);
        }

        return {
          success: true,
          mindId
        };
      }
    };
  }
}

// Create and export the client instance that matches LlongtermClient interface
export const llongterm = {
  minds: new LlongtermMindClient()
};
