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

    // Get thread roles with their capabilities
    const { data: threadRoles, error: threadRolesError } = await supabase
      .from('thread_roles')
      .select(`
        role_id,
        role:roles (
          id,
          special_capabilities,
          instructions,
          model
        )
      `)
      .eq('thread_id', threadId);

    if (threadRolesError) throw threadRolesError;
    
    if (!threadRoles?.length) {
      console.log('No roles found for thread');
      return [];
    }

    // Calculate effectiveness for all roles with enhanced specialization scoring
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

        // Additional scoring based on special capabilities
        const capabilityScore = tr.role.special_capabilities?.reduce((acc: number, cap: string) => {
          const isRelevant = content.toLowerCase().includes(cap.toLowerCase());
          return acc + (isRelevant ? 0.2 : 0);
        }, 0) || 0;

        return {
          roleId: tr.role_id,
          score: (score || 0) + capabilityScore,
          model: tr.role.model
        };
      })
    );

    // Sort by score and ensure at least one role responds
    const sortedRoles = scoredRoles.sort((a, b) => b.score - a.score);
    const threshold = 0.3;
    
    // Get roles that meet the threshold, or at least the best one
    const selectedRoles = sortedRoles.filter(role => role.score >= threshold);
    if (!selectedRoles.length && sortedRoles.length > 0) {
      selectedRoles.push(sortedRoles[0]); // Include the best role even if below threshold
    }

    // Map to chain format with order
    const chain = selectedRoles.map((role, index) => ({
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