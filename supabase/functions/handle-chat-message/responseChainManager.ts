import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { ResponseChain } from "./types.ts";

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

    // Get best responding roles based on effectiveness
    const { data: bestRoles, error: rolesError } = await supabase.rpc(
      'get_best_responding_role',
      { 
        p_thread_id: threadId,
        p_context: content,
        p_threshold: 0.3
      }
    );

    if (rolesError) {
      console.error('Error getting best roles:', rolesError);
      throw rolesError;
    }

    console.log('Best responding roles:', bestRoles);

    // If no roles meet the threshold, get all available roles and pick the best one
    if (!bestRoles?.length) {
      console.log('No roles met threshold, selecting fallback role');
      const { data: threadRoles } = await supabase
        .from('thread_roles')
        .select('role_id, roles(*)')
        .eq('thread_id', threadId);

      if (!threadRoles?.length) {
        console.log('No roles found for thread');
        return [];
      }

      // Calculate effectiveness for all roles and pick the best one
      const scoredRoles = await Promise.all(
        threadRoles.map(async (tr) => {
          const { data: score } = await supabase.rpc(
            'calculate_role_effectiveness',
            {
              p_role_id: tr.role_id,
              p_thread_id: threadId,
              p_context: content
            }
          );
          return {
            roleId: tr.role_id,
            score: score || 0
          };
        })
      );

      // Sort by score and take the best one
      const bestRole = scoredRoles.sort((a, b) => b.score - a.score)[0];
      if (bestRole) {
        return [{
          roleId: bestRole.roleId,
          chainOrder: 1
        }];
      }
    }

    // Map the best roles to chain format
    const chain = bestRoles.map((role) => ({
      roleId: role.role_id,
      chainOrder: role.chain_order
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
    // Update the message with chain order
    const { error: messageError } = await supabase
      .from('messages')
      .update({ chain_order: chainOrder })
      .eq('id', messageId);

    if (messageError) throw messageError;

    // Update conversation state metrics
    const { error: stateError } = await supabase
      .from('conversation_states')
      .update({
        chain_metrics: supabase.sql`jsonb_set(
          chain_metrics,
          '{successful_chains}',
          (chain_metrics->'successful_chains') || jsonb_build_array(${chainOrder})
        )`
      })
      .eq('thread_id', threadId);

    if (stateError) throw stateError;

    console.log('Chain progress updated successfully');
  } catch (error) {
    console.error('Error updating chain progress:', error);
    throw error;
  }
}