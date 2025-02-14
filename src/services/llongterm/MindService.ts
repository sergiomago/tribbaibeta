
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
      
      return await llongtermClient.createMind(validatedOptions);
    } catch (error) {
      throw new LlongtermError(`Failed to create mind: ${error.message}`);
    }
  }

  async getMind(mindId: string): Promise<Mind> {
    try {
      return await llongtermClient.getMind(mindId);
    } catch (error) {
      if (error.message.includes('not found')) {
        throw new MindNotFoundError(mindId);
      }
      throw new LlongtermError(`Failed to get mind: ${error.message}`);
    }
  }

  async remember(mind: Mind, messages: Message[]): Promise<RememberResponse> {
    try {
      const validatedMessages = messages.map(msg => validateMessage({
        author: msg.author || 'user',
        message: msg.message,
        metadata: {
          ...msg.metadata,
          timestamp: msg.metadata?.timestamp || new Date().toISOString()
        }
      }));

      // Pass the array directly as per type definition
      return await mind.remember(validatedMessages);
    } catch (error) {
      throw new LlongtermError(`Failed to store memory: ${error.message}`);
    }
  }

  async ask(mind: Mind, question: string): Promise<KnowledgeResponse> {
    try {
      // Only pass the question string as per type definition
      return await mind.ask(question);
    } catch (error) {
      throw new LlongtermError(`Failed to query mind: ${error.message}`);
    }
  }

  async deleteMind(mindId: string): Promise<boolean> {
    try {
      const response = await llongtermClient.deleteMind(mindId);
      return response.success;
    } catch (error) {
      console.error(`Failed to delete mind ${mindId}:`, error);
      return false;
    }
  }
}

export const mindService = new MindService();
