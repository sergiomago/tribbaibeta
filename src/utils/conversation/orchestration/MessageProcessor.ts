import { Message } from "@/types";
import { messageEnrichmentMiddleware } from "@/utils/llongterm/MessageEnrichmentMiddleware";

export class MessageProcessor {
  async processMessage(message: Message): Promise<Message> {
    // Skip enrichment for user messages
    if (message.role?.tag === 'user') {
      return message;
    }

    // Enrich message with Llongterm context
    const enrichedMessage = await messageEnrichmentMiddleware.enrichMessage(message);
    
    return enrichedMessage;
  }
}

export const messageProcessor = new MessageProcessor();