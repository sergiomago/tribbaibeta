import Llongterm from 'llongterm';

export class MemoryService {
  private static llongtermClient: any = null;

  private static async getMind() {
    if (!this.llongtermClient) {
      try {
        // Import and use Llongterm as a default import
        const llongterm = await import('llongterm').then(m => m.default);
        const client = llongterm({
          keys: {
            llongterm: import.meta.env.VITE_LLONGTERM_KEY,
            openai: import.meta.env.VITE_OPENAI_KEY
          }
        });
        
        this.llongtermClient = await client.create({ 
          specialism: 'Tribbai' 
        });
        
        console.log('Mind created successfully');
        return this.llongtermClient;
      } catch (error) {
        console.error('Error creating mind:', error);
        throw error;
      }
    }
    return this.llongtermClient;
  }

  static async getConversationContext(conversationId: string): Promise<string[]> {
    try {
      const mind = await this.getMind();
      const { memories } = await mind.retrieve({
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