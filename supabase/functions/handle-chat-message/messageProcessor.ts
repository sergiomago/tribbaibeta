import { Message } from "./types.ts";
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { compileMessageContext } from "./contextCompiler.ts";

export async function processMessage(
  supabase: SupabaseClient,
  message: Message,
  threadId: string,
  roleId: string
): Promise<Message> {
  try {
    // Compile message context
    const context = await compileMessageContext(
      supabase,
      threadId,
      roleId,
      message.content
    );

    // Enrich message metadata with context
    const enrichedMetadata = {
      ...message.metadata,
      context: {
        memories: context.memories,
        previousInteractions: context.previousInteractions,
        conversationDepth: context.conversationDepth,
        chainContext: context.chainContext,
        timestamp: new Date().toISOString()
      }
    };

    // Return enriched message
    return {
      ...message,
      metadata: enrichedMetadata
    };
  } catch (error) {
    console.error('Error processing message:', error);
    return message;
  }
}