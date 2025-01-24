import { Message } from "@/types";
import { mindManager } from "./MindManager";
import { supabase } from "@/integrations/supabase/client";

interface EnrichmentContext {
  threadId: string;
  roleId: string;
  content: string;
  metadata?: Record<string, any>;
}

export class MessageEnrichmentMiddleware {
  async enrichMessage(message: Message): Promise<Message> {
    try {
      // Get role's mind
      const mindId = await mindManager.getMindForRole(message.role_id!);
      
      // Prepare enrichment context
      const context: EnrichmentContext = {
        threadId: message.thread_id,
        roleId: message.role_id!,
        content: message.content,
        metadata: message.metadata || {}
      };

      // Get relevant memories
      const memories = await mindManager.getRoleMemories(message.role_id!, message.content);
      
      // Enrich message metadata with context
      const enrichedMetadata = {
        ...message.metadata,
        llongterm_context: {
          mind_id: mindId,
          memories: memories.memories,
          context_score: memories.contextScore,
          timestamp: new Date().toISOString()
        }
      };

      // Store the enriched context
      await this.storeEnrichmentContext(context, enrichedMetadata);

      // Return enriched message
      return {
        ...message,
        metadata: enrichedMetadata
      };
    } catch (error) {
      console.error('Error enriching message:', error);
      // If enrichment fails, return original message
      return message;
    }
  }

  private async storeEnrichmentContext(
    context: EnrichmentContext,
    enrichedMetadata: Record<string, any>
  ): Promise<void> {
    try {
      await supabase.from('role_memories').insert({
        role_id: context.roleId,
        content: context.content,
        context_type: 'message_enrichment',
        metadata: enrichedMetadata,
        thread_id: context.threadId
      });
    } catch (error) {
      console.error('Error storing enrichment context:', error);
    }
  }
}

export const messageEnrichmentMiddleware = new MessageEnrichmentMiddleware();