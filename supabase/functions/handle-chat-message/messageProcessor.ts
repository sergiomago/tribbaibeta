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
  console.log('Starting message processing for role:', roleId);

  try {
    // Build conversation context
    console.log('Building conversation context...');
    const context = await buildConversationContext(
      supabase,
      threadId,
      roleId,
      previousResponses
    );

    if (!context.role) {
      throw new Error(`Role not found: ${roleId}`);
    }

    console.log('Context built successfully:', {
      roleSequence: context.roleSequence,
      position: context.currentPosition
    });

    // Generate response
    console.log('Generating response...');
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

    console.log('Response generated successfully');
    return response;
  } catch (error) {
    console.error('Error in processMessage:', error);
    // Rethrow with more context
    throw new Error(`Failed to process message: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}