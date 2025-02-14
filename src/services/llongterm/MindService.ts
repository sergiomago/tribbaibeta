
import { llongtermClient } from '@/lib/llongterm/client';
import { validateCreateOptions, validateMessage } from '@/lib/llongterm/validation';
import type { CreateOptions, Mind, Message, RememberResponse, KnowledgeResponse } from 'llongterm';
import { LlongtermError, MindNotFoundError } from '@/lib/llongterm/errors';
import { supabase } from '@/integrations/supabase/client';

type StructuredMemory = {
  summary: string;
  structured: Record<string, unknown>;
  unstructured: Record<string, unknown>;
};

type MindConfig = {
  contextWindow?: number;
  maxMemories?: number;
  relevanceThreshold?: number;
};

export class MindService {
  async createMind(options: CreateOptions & { structured_memory?: StructuredMemory, config?: MindConfig }): Promise<Mind> {
    try {
      const validatedOptions = validateCreateOptions({
        ...options,
        initialMemory: options.structured_memory || {
          summary: '',
          structured: {},
          unstructured: {}
        }
      });
      
      console.log('Creating new mind with options:', validatedOptions);
      const mind = await llongtermClient.createMind(validatedOptions);

      // Store the mind reference in the database
      const { error } = await supabase
        .from('role_minds')
        .insert({
          id: mind.id, // Use id instead of mind_id to match the schema
          role_id: options.metadata?.roleId,
          status: 'active',
          metadata: options.metadata,
          structured_memory: options.structured_memory,
          memory_configuration: options.config
        });

      if (error) {
        console.error('Failed to store mind reference:', error);
        await llongtermClient.deleteMind(mind.id);
        throw error;
      }

      return mind;
    } catch (error) {
      console.error('Failed to create mind:', error);
      throw new LlongtermError(`Failed to create mind: ${(error as Error).message}`);
    }
  }

  async getMind(mindId: string): Promise<Mind> {
    try {
      console.log('Retrieving mind:', mindId);
      return await llongtermClient.getMind(mindId);
    } catch (error) {
      console.error('Error retrieving mind:', error);
      if ((error as Error).message.includes('not found')) {
        throw new MindNotFoundError(mindId);
      }
      throw new LlongtermError(`Failed to get mind: ${(error as Error).message}`);
    }
  }

  async rememberThread(mind: Mind, thread: { messages: Message[], metadata?: Record<string, unknown> }): Promise<RememberResponse> {
    try {
      console.log('Storing thread in mind:', { mindId: mind.id, messageCount: thread.messages.length });
      
      const validatedMessages = thread.messages.map(msg => validateMessage({
        author: msg.author || 'user',
        message: msg.message,
        metadata: {
          ...msg.metadata,
          timestamp: msg.metadata?.timestamp || new Date().toISOString(),
          threadContext: thread.metadata
        }
      }));

      const response = await mind.remember(validatedMessages);

      // Update message references in the database
      for (const msg of thread.messages) {
        if (msg.metadata?.messageId) {
          await supabase
            .from('messages')
            .update({ llongterm_memory_id: response.memoryId })
            .eq('id', msg.metadata.messageId);
        }
      }

      return response;
    } catch (error) {
      console.error('Failed to store thread:', error);
      throw new LlongtermError(`Failed to store thread: ${(error as Error).message}`);
    }
  }

  async remember(mind: Mind, messages: Message[]): Promise<RememberResponse> {
    try {
      console.log('Storing memories in mind:', { mindId: mind.id, messageCount: messages.length });
      
      const validatedMessages = messages.map(msg => validateMessage({
        author: msg.author || 'user',
        message: msg.message,
        metadata: {
          ...msg.metadata,
          timestamp: msg.metadata?.timestamp || new Date().toISOString()
        }
      }));

      const response = await mind.remember(validatedMessages);

      // Update message references if messageId is provided
      for (const msg of messages) {
        if (msg.metadata?.messageId) {
          await supabase
            .from('messages')
            .update({ llongterm_memory_id: response.memoryId })
            .eq('id', msg.metadata.messageId);
        }
      }

      return response;
    } catch (error) {
      console.error('Failed to store memory:', error);
      throw new LlongtermError(`Failed to store memory: ${(error as Error).message}`);
    }
  }

  async ask(mind: Mind, question: string): Promise<KnowledgeResponse> {
    try {
      console.log('Querying mind:', { mindId: mind.id, question });
      const response = await mind.ask(question);
      console.log('Mind response:', { 
        mindId: mind.id,
        confidence: response.confidence,
        memoryCount: response.relevantMemories.length 
      });
      return response;
    } catch (error) {
      console.error('Failed to query mind:', error);
      throw new LlongtermError(`Failed to query mind: ${(error as Error).message}`);
    }
  }

  async deleteMind(mindId: string): Promise<boolean> {
    try {
      console.log('Deleting mind:', mindId);
      const response = await llongtermClient.deleteMind(mindId);
      
      if (response.success) {
        // Update mind status in database
        await supabase
          .from('role_minds')
          .update({ status: 'deleted' })
          .eq('id', mindId); // Use id instead of mind_id
      }

      console.log('Mind deleted:', mindId);
      return response.success;
    } catch (error) {
      console.error(`Failed to delete mind ${mindId}:`, error);
      return false;
    }
  }
}

export const mindService = new MindService();
