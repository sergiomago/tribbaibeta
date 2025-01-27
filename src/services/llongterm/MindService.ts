import { llongtermClient } from '@/lib/llongterm/client';
import { validateCreateOptions, validateMessage } from '@/lib/llongterm/validation';
import type { CreateOptions, Mind, Message, RememberResponse, KnowledgeResponse } from 'llongterm';
import { LlongtermError } from './errors';

export class MindService {
  async createMind(options: CreateOptions): Promise<Mind> {
    const validatedOptions = validateCreateOptions(options);
    return await llongtermClient.createMind(validatedOptions);
  }

  async getMind(mindId: string): Promise<Mind> {
    try {
      return await llongtermClient.getMind(mindId);
    } catch (error) {
      throw new MindNotFoundError(mindId);
    }
  }

  async remember(mind: Mind, messages: Message[]): Promise<RememberResponse> {
    const validatedMessages = messages.map(msg => validateMessage(msg));
    return await mind.remember(validatedMessages);
  }

  async ask(mind: Mind, question: string): Promise<KnowledgeResponse> {
    return await mind.ask(question);
  }

  async deleteMind(mindId: string): Promise<boolean> {
    const response = await llongtermClient.deleteMind(mindId);
    return response.success;
  }
}

export const mindService = new MindService();