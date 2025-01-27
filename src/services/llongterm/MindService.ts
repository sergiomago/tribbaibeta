import { llongtermClient } from '@/lib/llongterm/client';
import { validateCreateOptions, validateMessage } from '@/lib/llongterm/validation';
import type { CreateOptions, Mind, Message, RememberResponse, KnowledgeResponse } from 'llongterm';
import { LlongtermError, MindNotFoundError } from '@/lib/llongterm/errors';

export class MindService {
  async createMind(options: CreateOptions): Promise<Mind> {
    try {
      const validatedOptions = validateCreateOptions({
        ...options,
        initialMemory: options.initialMemory || {
          summary: '',
          unstructured: {},
          structured: {}
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
        message: msg.message || '',
        timestamp: msg.timestamp || Date.now(),
        metadata: msg.metadata || {}
      }));
      return await mind.remember(validatedMessages);
    } catch (error) {
      throw new LlongtermError(`Failed to store memory: ${error.message}`);
    }
  }

  async ask(mind: Mind, question: string): Promise<KnowledgeResponse> {
    try {
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
      // Don't throw on deletion errors, just return false
      console.error(`Failed to delete mind ${mindId}:`, error);
      return false;
    }
  }
}

export const mindService = new MindService();