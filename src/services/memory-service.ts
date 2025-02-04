import Llongterm from 'llongterm';

export class MemoryService {
  private static llongterm = new Llongterm({
    keys: {
      llongterm: import.meta.env.VITE_LLONGTERM_KEY,
      openai: import.meta.env.VITE_OPENAI_KEY
    }
  });

  private static mind: any;

  private static async getMind() {
    if (!this.mind) {
      try {
        this.mind = await this.llongterm.create({ specialism: 'Tribbai' });
        console.log('Mind created successfully');
      } catch (error) {
        console.error('Error creating mind:', error);
        throw error;
      }
    }
    return this.mind;
  }

  static async getConversationContext(conversationId: string): Promise<string[]> {
    try {
      const { memories } = await this.llongterm.retrieve({
        conversation_id: conversationId,
        depth: 3
      });
      return memories.map(m => m.content);
    } catch (error) {
      console.error('Memory retrieval failed:', error);
      return [];
    }
  }

  static async storeConversationMemory(conversationId: string, thread: { author: string, message: string }[]): Promise<void> {
    try {
      const mind = await this.getMind();
      const enrichedMessage = await mind.remember({ thread });
      console.log('Memory stored successfully:', enrichedMessage);
    } catch (error) {
      console.error('Failed to store memory:', error);
    }
  }
}
