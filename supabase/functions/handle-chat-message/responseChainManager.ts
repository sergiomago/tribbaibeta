import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { ResponseChain } from "./types.ts";

export async function buildResponseChain(
  supabase: SupabaseClient,
  threadId: string,
  content: string,
  taggedRoleId?: string
): Promise<ResponseChain[]> {
  console.log('Building interactive response chain:', { threadId, taggedRoleId });

  try {
    // If a role is tagged, create a focused chain with that role
    if (taggedRoleId) {
      console.log('Creating focused chain for tagged role');
      return [{
        roleId: taggedRoleId,
        chainOrder: 1
      }];
    }

    // Get thread roles with their capabilities and recent performance
    const { data: threadRoles, error: threadRolesError } = await supabase
      .from('thread_roles')
      .select(`
        role_id,
        role:roles (
          id,
          special_capabilities,
          instructions,
          model,
          tag
        )
      `)
      .eq('thread_id', threadId);

    if (threadRolesError) throw threadRolesError;
    
    if (!threadRoles?.length) {
      console.log('No roles found for thread');
      return [];
    }

    // Calculate effectiveness scores with enhanced context awareness
    const scoredRoles = await Promise.all(
      threadRoles.map(async (tr) => {
        // Get role's effectiveness score
        const { data: score } = await supabase.rpc(
          'calculate_role_effectiveness',
          {
            p_role_id: tr.role_id,
            p_thread_id: threadId,
            p_context: content
          }
        );

        // Get recent interactions to analyze role synergy
        const { data: recentInteractions } = await supabase
          .from('role_interactions')
          .select('effectiveness_score, chain_effectiveness')
          .eq('thread_id', threadId)
          .eq('initiator_role_id', tr.role_id)
          .order('created_at', { ascending: false })
          .limit(3);

        // Calculate synergy score from recent interactions
        const synergyScore = recentInteractions?.reduce((acc, interaction) => 
          acc + (interaction.chain_effectiveness || 0), 0) / (recentInteractions?.length || 1);

        // Additional scoring based on special capabilities
        const capabilityScore = tr.role.special_capabilities?.reduce((acc: number, cap: string) => {
          const isRelevant = content.toLowerCase().includes(cap.toLowerCase());
          return acc + (isRelevant ? 0.2 : 0);
        }, 0) || 0;

        // Combined score with weighted components
        const combinedScore = (
          (score || 0) * 0.4 +  // Base effectiveness
          synergyScore * 0.3 +  // Role synergy
          capabilityScore * 0.3  // Capability relevance
        );

        return {
          roleId: tr.role_id,
          score: combinedScore,
          model: tr.role.model,
          tag: tr.role.tag
        };
      })
    );

    // Sort by score and ensure optimal chain length
    const sortedRoles = scoredRoles.sort((a, b) => b.score - a.score);
    const threshold = 0.3;
    
    // Select roles that meet the threshold or are specifically needed
    const selectedRoles = sortedRoles.filter(role => 
      role.score >= threshold || 
      role.tag === '@docanalyst' || // Always include analyst for document context
      role.tag === '@web' // Always include web researcher for external context
    );

    // Ensure at least one role responds
    if (!selectedRoles.length && sortedRoles.length > 0) {
      selectedRoles.push(sortedRoles[0]);
    }

    // Map to chain format with optimized order
    const chain = selectedRoles.map((role, index) => ({
      roleId: role.roleId,
      chainOrder: index + 1
    }));

    console.log('Built interactive response chain:', chain);
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
      .update({ 
        chain_order: chainOrder,
        metadata: {
          chain_position: chainOrder,
          timestamp: new Date().toISOString()
        }
      })
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