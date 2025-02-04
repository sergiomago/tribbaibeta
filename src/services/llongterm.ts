import { Message } from '../types/database';
import { supabase } from './supabase';

export class LlongtermService {
  private static readonly API_URL = 'https://api.llongterm.com/v1';

  static async syncMemories(userId: string) {
    const { data: unsyncedMessages } = await supabase
      .from('messages')
      .select('*')
      .is('llongterm_memory_id', null)
      .eq('user_id', userId);

    for (const message of unsyncedMessages || []) {
      const memory = await this.storeMemory(message);
      await supabase
        .from('messages')
        .update({ llongterm_memory_id: memory.id })
        .eq('id', message.id);
    }
  }

  private static async storeMemory(message: Message) {
    const response = await fetch(`${this.API_URL}/memories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_LLONGTERM_KEY}`
      },
      body: JSON.stringify({
        content: message.content,
        metadata: {
          role_id: message.role_id,
          conversation_id: message.conversation_id,
          embedding: message.embedding
        }
      })
    });
    return response.json();
  }
}
