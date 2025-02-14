
import { llongtermClient } from '@/lib/llongterm/client';
import { validateCreateOptions, validateMessage } from '@/lib/llongterm/validation';
import type { CreateOptions, Mind, Message, RememberResponse, KnowledgeResponse } from 'llongterm';
import { LlongtermError, MindNotFoundError } from '@/lib/llongterm/errors';

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
      return await llongtermClient.createMind(validatedOptions);
    } catch (error) {
      console.error('Failed to create mind:', error);
      throw new LlongtermError(`Failed to create mind: ${error.message}`);
    }
  }

  async getMind(mindId: string): Promise<Mind> {
    try {
      console.log('Retrieving mind:', mindId);
      return await llongtermClient.getMind(mindId);
    } catch (error) {
      console.error('Error retrieving mind:', error);
      if (error.message.includes('not found')) {
        throw new MindNotFoundError(mindId);
      }
      throw new LlongtermError(`Failed to get mind: ${error.message}`);
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

      return await mind.remember(validatedMessages);
    } catch (error) {
      console.error('Failed to store thread:', error);
      throw new LlongtermError(`Failed to store thread: ${error.message}`);
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

      return await mind.remember(validatedMessages);
    } catch (error) {
      console.error('Failed to store memory:', error);
      throw new LlongtermError(`Failed to store memory: ${error.message}`);
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
      throw new LlongtermError(`Failed to query mind: ${error.message}`);
    }
  }

  async deleteMind(mindId: string): Promise<boolean> {
    try {
      console.log('Deleting mind:', mindId);
      const response = await llongtermClient.deleteMind(mindId);
      console.log('Mind deleted:', mindId);
      return response.success;
    } catch (error) {
      console.error(`Failed to delete mind ${mindId}:`, error);
      return false;
    }
  }
}

export const mindService = new MindService();
