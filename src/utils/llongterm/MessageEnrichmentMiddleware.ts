import { Message } from "@/types";
import { mindManager } from "./MindManager";
import { supabase } from "@/integrations/supabase/client";
import { getLlongtermClient } from "./client";

export class MessageEnrichmentMiddleware {
  async enrichMessage(message: Message): Promise<Message> {
    try {
      if (!message.role_id) {
        return message;
      }

      // Get role's mind
      const mindId = await mindManager.getMindForRole(message.role_id);
      const client = getLlongtermClient();
      const mind = await client.getMind(mindId);
      
      // Get relevant memories using official SDK
      const memories = await mind.recall(message.content);
      
      // Enrich message metadata with context
      const enrichedMetadata = {
        ...message.metadata,
        llongterm_context: {
          mind_id: mindId,
          memories: memories.results,
          context_score: memories.metadata.relevance,
          timestamp: new Date().toISOString()
        }
      };

      // Store the enriched context
      await this.storeEnrichmentContext({
        threadId: message.thread_id,
        roleId: message.role_id,
        content: message.content,
        metadata: enrichedMetadata
      });

      // Return enriched message
      return {
        ...message,
        metadata: enrichedMetadata
      };
    } catch (error) {
      console.error('Error enriching message:', error);
      return message;
    }
  }

  private async storeEnrichmentContext({
    threadId,
    roleId,
    content,
    metadata
  }: {
    threadId: string;
    roleId: string;
    content: string;
    metadata: Record<string, any>;
  }): Promise<void> {
    try {
      await supabase.from('role_memories').insert({
        role_id: roleId,
        content: content,
        context_type: 'message_enrichment',
        metadata: metadata,
        thread_id: threadId
      });
    } catch (error) {
      console.error('Error storing enrichment context:', error);
    }
  }
}

export const messageEnrichmentMiddleware = new MessageEnrichmentMiddleware();