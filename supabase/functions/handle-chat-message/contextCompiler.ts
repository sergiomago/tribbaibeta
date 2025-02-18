
import { SupabaseClient } from '@supabase/supabase-js';
import { ContextData } from "./types.ts";

export async function compileContext(
  supabase: SupabaseClient,
  { threadId, roleId, content, analysis }: ContextData
): Promise<any> {
  // Get recent messages from the thread
  const { data: recentMessages } = await supabase
    .from('messages')
    .select('*')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: false })
    .limit(5);

  return {
    recent_messages: recentMessages || [],
    current_context: {
      content,
      analysis
    }
  };
}
