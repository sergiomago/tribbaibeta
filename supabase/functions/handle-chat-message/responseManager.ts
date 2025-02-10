
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import OpenAI from "https://esm.sh/openai@4.26.0";
import { processMessage } from "./messageProcessor.ts";

export async function handleResponseChain(
  supabase: SupabaseClient,
  threadId: string,
  message: any,
  orderedRoles: { roleId: string; score: number }[],
  openai: OpenAI
): Promise<void> {
  console.log('Processing with ordered roles:', orderedRoles);

  for (const { roleId, score } of orderedRoles) {
    try {
      console.log(`Processing response for role ${roleId}`);
      
      const { data: previousResponses } = await supabase
        .from('messages')
        .select(`
          content,
          role:roles(name, expertise_areas),
          role_id,
          created_at,
          depth_level,
          chain_position
        `)
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });

      const responseContent = await processMessage(
        openai,
        supabase,
        threadId,
        roleId,
        message,
        previousResponses || []
      );

      if (!responseContent) {
        console.log(`Skipping response for role ${roleId} due to depth limit`);
        continue;
      }

    } catch (error) {
      console.error(`Error processing response for role ${roleId}:`, error);
      throw error;
    }
  }
}
