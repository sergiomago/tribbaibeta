import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { ResponseChain } from "./types.ts";

export async function buildResponseChain(
  supabase: SupabaseClient,
  threadId: string,
  content: string,
  taggedRoleId?: string | null
): Promise<ResponseChain[]> {
  console.log('Building response chain:', { threadId, taggedRoleId });

  try {
    // If a role is tagged, only that role should respond
    if (taggedRoleId) {
      console.log('Tagged role response chain');
      // Verify the role exists in the thread
      const { data: threadRole } = await supabase
        .from('thread_roles')
        .select('role_id')
        .eq('thread_id', threadId)
        .eq('role_id', taggedRoleId)
        .maybeSingle();

      if (!threadRole) {
        console.log('Tagged role not found in thread');
        return [];
      }

      // Return only the tagged role in the chain
      return [{
        roleId: taggedRoleId,
        chainOrder: 1
      }];
    }

    // Get thread roles with error handling
    const { data: threadRoles, error: threadRolesError } = await supabase
      .from('thread_roles')
      .select('role_id')
      .eq('thread_id', threadId);

    if (threadRolesError) {
      console.error('Error fetching thread roles:', threadRolesError);
      throw threadRolesError;
    }
    
    if (!threadRoles?.length) {
      console.log('No roles found for thread');
      return [];
    }

    // Calculate effectiveness for all roles with safe defaults
    const scoredRoles = await Promise.all(
      threadRoles.map(async (tr) => {
        try {
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
        } catch (error) {
          console.error('Error calculating role effectiveness:', error);
          return {
            roleId: tr.role_id,
            score: 0
          };
        }
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