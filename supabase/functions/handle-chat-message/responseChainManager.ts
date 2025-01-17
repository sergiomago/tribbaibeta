import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { ResponseChain } from "./types.ts";
import { RelevanceScorer } from "./roleSelector.ts";

export async function buildResponseChain(
  supabase: SupabaseClient,
  threadId: string,
  content: string,
  taggedRoleId?: string
): Promise<ResponseChain[]> {
  console.log('Building response chain:', { threadId, taggedRoleId });

  try {
    // If a role is tagged, only that role should respond
    if (taggedRoleId) {
      console.log('Tagged role response chain');
      return [{
        roleId: taggedRoleId,
        chainOrder: 1
      }];
    }

    // Get all available roles for this thread
    const { data: threadRoles } = await supabase
      .from('thread_roles')
      .select('role_id, roles(*)')
      .eq('thread_id', threadId);

    if (!threadRoles?.length) {
      console.log('No roles found for thread');
      return [];
    }

    // Score roles for relevance
    const relevanceScorer = new RelevanceScorer();
    const scoredRoles = await Promise.all(
      threadRoles.map(async (tr) => ({
        roleId: tr.role_id,
        score: await relevanceScorer.calculateRelevance(tr.roles, content, threadId, supabase)
      }))
    );

    // Filter out low-relevance roles (threshold: 0.3)
    const relevantRoles = scoredRoles
      .filter(role => role.score > 0.3)
      .sort((a, b) => b.score - a.score);

    // Build chain with ordered roles
    const chain = relevantRoles.map((role, index) => ({
      roleId: role.roleId,
      chainOrder: index + 1
    }));

    console.log('Built response chain:', chain);
    return chain;
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