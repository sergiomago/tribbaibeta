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

    // First attempt: Try with normal threshold (0.3)
    let selectedRoles = await tryGetRespondingRoles(supabase, threadId, content, 0.3);
    
    // Second attempt: If no roles qualify, try with lower threshold (0.1)
    if (!selectedRoles.length) {
      console.log('No roles met standard threshold, trying lower threshold');
      selectedRoles = await tryGetRespondingRoles(supabase, threadId, content, 0.1);
    }
    
    // Final fallback: If still no roles, select a random role
    if (!selectedRoles.length) {
      console.log('No roles met lower threshold, selecting random role');
      const { data: threadRoles } = await supabase
        .from('thread_roles')
        .select('role_id')
        .eq('thread_id', threadId);
      
      if (!threadRoles?.length) {
        throw new Error('No roles found for thread');
      }
      
      // Select random role
      const randomRole = threadRoles[Math.floor(Math.random() * threadRoles.length)];
      selectedRoles = [{
        roleId: randomRole.role_id,
        score: 0.1,
        chainOrder: 1
      }];
    }

    // Map to chain format
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

async function tryGetRespondingRoles(
  supabase: SupabaseClient,
  threadId: string,
  content: string,
  threshold: number
) {
  const { data: roles, error } = await supabase.rpc(
    'get_best_responding_role',
    {
      p_thread_id: threadId,
      p_context: content,
      p_threshold: threshold,
      p_max_roles: 3
    }
  );

  if (error) {
    console.error('Error getting responding roles:', error);
    throw error;
  }

  return roles || [];
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