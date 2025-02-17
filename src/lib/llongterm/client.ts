
import { supabase } from '@/integrations/supabase/client';
import { LlongtermError } from './errors';
import type { CreateOptions, Mind, DeleteResponse } from 'llongterm';

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

      // Return a Mind object with the necessary methods
      return {
        id: data.id,
        async kill() {
          const { error: deleteError } = await supabase.functions.invoke('delete-mind', {
            body: { mindId: data.id }
          });

          if (deleteError) {
            throw new Error(`Failed to delete mind: ${deleteError.message}`);
          }

          return {
            success: true,
            mindId: data.id
          };
        }
      };
    } catch (error) {
      console.error('Error creating mind:', error);
      throw new LlongtermError('Failed to create mind: ' + error.message);
    }
  }

  async get(mindId: string): Promise<Mind> {
    // For now, just return a basic mind object since we're focusing on creation
    return {
      id: mindId,
      async kill() {
        const { error: deleteError } = await supabase.functions.invoke('delete-mind', {
          body: { mindId }
        });

        if (deleteError) {
          throw new Error(`Failed to delete mind: ${deleteError.message}`);
        }

        return {
          success: true,
          mindId
        };
      }
    };
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
}

// Create and export the client instance that matches LlongtermClient interface
export const llongterm = {
  minds: new LlongtermMindClient()
};
