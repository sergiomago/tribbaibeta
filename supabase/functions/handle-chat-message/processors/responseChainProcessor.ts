
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

export async function getNextRespondingRole(
  supabase: SupabaseClient,
  threadId: string,
  lastMessageRole: string | null
): Promise<string | null> {
  const { data: responseOrder } = await supabase
    .from('thread_response_order')
    .select('*')
    .eq('thread_id', threadId)
    .order('response_position', { ascending: true });

  if (!responseOrder?.length) return null;

  if (!lastMessageRole) {
    return responseOrder[0].role_id;
  }

  const currentIndex = responseOrder.findIndex(r => r.role_id === lastMessageRole);
  if (currentIndex === -1) return responseOrder[0].role_id;

  const nextIndex = (currentIndex + 1) % responseOrder.length;
  return responseOrder[nextIndex].role_id;
}
