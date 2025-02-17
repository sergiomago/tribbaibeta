
import { llongterm } from '@/lib/llongterm/client';

interface LlongtermResponse {
  memories: { content: string }[];
}

export class MemoryService {
  private static mind: any = null;

  private static async getMind() {
    if (!this.mind) {
      try {
        this.mind = await llongterm.minds.create({ 
          specialism: 'Tribbai',
          specialismDepth: 1
        });
        
        console.log('Mind created successfully');
        return this.mind;
      } catch (error) {
        console.error('Error creating mind:', error);
        throw error;
      }
    }
    return this.mind;
  }

  static async getConversationContext(conversationId: string): Promise<string[]> {
    try {
      const mind = await this.getMind();
      const response = await mind.ask(`What do you remember about conversation ${conversationId}?`);
      return [response.answer];
    } catch (error) {
      console.error('Memory retrieval failed:', error);
      return [];
    }
  }

  static async storeConversationMemory(conversationId: string, thread: { author: string, message: string }[]): Promise<void> {
    try {
      const mind = await this.getMind();
      await mind.remember(thread.map(m => ({
        content: m.message,
        metadata: {
          author: m.author,
          conversationId,
          timestamp: new Date().toISOString()
        }
      })));
      console.log('Memory stored successfully');
    } catch (error) {
      console.error('Failed to store memory:', error);
    }
  }
}
