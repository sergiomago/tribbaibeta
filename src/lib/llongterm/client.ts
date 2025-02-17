
import { supabase } from '@/integrations/supabase/client';
import { LlongtermError } from './errors';
import type { CreateOptions, Mind } from 'llongterm';

// Create a wrapper for Llongterm operations
class LlongtermClient {
  async createMind(options: CreateOptions): Promise<Mind> {
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
          // We'll implement this later when needed
          console.log('Kill method called for mind:', data.id);
        }
      };
    } catch (error) {
      console.error('Error creating mind:', error);
      throw new LlongtermError('Failed to create mind: ' + error.message);
    }
  }

  // We'll add get() and delete() methods when needed
  async getMind(mindId: string): Promise<Mind | null> {
    // For now, just return a basic mind object since we're focusing on creation
    return {
      id: mindId,
      async kill() {
        console.log('Kill method called for mind:', mindId);
      }
    };
  }

  async deleteMind(mindId: string): Promise<void> {
    // We'll implement this properly later
    console.log('Delete called for mind:', mindId);
  }
}

// Create and export the client instance
export const llongterm = {
  minds: new LlongtermClient()
};
