import OpenAI from "https://esm.sh/openai@4.26.0";
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Message } from "./types.ts";
import { buildConversationContext } from "./ContextBuilder.ts";
import { generateResponse } from "./ResponseGenerator.ts";

export async function processMessage(
  openai: OpenAI,
  supabase: SupabaseClient,
  threadId: string,
  roleId: string,
  userMessage: any,
  previousResponses: Message[]
) {
  console.log('Processing message for role:', roleId);

  try {
    // Build conversation context
    const context = await buildConversationContext(
      supabase,
      threadId,
      roleId,
      previousResponses
    );

    // Generate response
    const response = await generateResponse(
      openai,
      context.role,
      context.roleSequence,
      context.currentPosition,
      context.previousRole,
      context.nextRole,
      context.formattedResponses,
      userMessage.content
    );

    console.log('Generated response successfully');
    return response;
  } catch (error) {
    console.error('Error processing message:', error);
    throw error;
  }
}