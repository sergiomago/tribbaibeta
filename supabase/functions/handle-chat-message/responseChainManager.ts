import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { ResponseChain } from "./types.ts";

export async function buildResponseChain(
  supabase: SupabaseClient,
  threadId: string,
  taggedRoleId?: string
): Promise<ResponseChain[]> {
  console.log('Building response chain:', { threadId, taggedRoleId });

  try {
    const { data: chain, error } = await supabase.rpc(
      'get_conversation_chain',
      { 
        p_thread_id: threadId,
        p_tagged_role_id: taggedRoleId 
      }
    );

    if (error) throw error;

    console.log('Response chain built:', chain);
    return chain.map((item: any) => ({
      roleId: item.role_id,
      chainOrder: item.chain_order
    }));
  } catch (error) {
    console.error('Error building response chain:', error);
    throw error;
  }
}

export async function validateChainOrder(
  supabase: SupabaseClient,
  threadId: string,
  roleId: string,
  order: number
): Promise<boolean> {
  console.log('Validating chain order:', { threadId, roleId, order });

  try {
    // Check if this role has already responded in this order
    const { data, error } = await supabase
      .from('messages')
      .select('id')
      .eq('thread_id', threadId)
      .eq('role_id', roleId)
      .eq('chain_order', order)
      .maybeSingle();

    if (error) throw error;

    const isValid = !data;
    console.log('Chain order validation result:', isValid);
    return isValid;
  } catch (error) {
    console.error('Error validating chain order:', error);
    throw error;
  }
}

export async function updateChainProgress(
  supabase: SupabaseClient,
  threadId: string,
  messageId: string,
  chainOrder: number
): Promise<void> {
  console.log('Updating chain progress:', { threadId, messageId, chainOrder });

  try {
    const { error } = await supabase
      .from('messages')
      .update({ chain_order: chainOrder })
      .eq('id', messageId);

    if (error) throw error;
    console.log('Chain progress updated successfully');
  } catch (error) {
    console.error('Error updating chain progress:', error);
    throw error;
  }
}