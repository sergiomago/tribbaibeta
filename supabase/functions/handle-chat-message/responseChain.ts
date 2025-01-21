import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
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

    // Get best responding roles based on context
    const { data: roles, error } = await supabase.rpc(
      'get_best_responding_role',
      { 
        p_thread_id: threadId,
        p_context: content,
        p_threshold: 0.3,
        p_max_roles: 3
      }
    );

    if (error) throw error;
    console.log('Selected responding roles:', roles);
    
    if (!roles?.length) {
      console.log('No roles found for thread');
      return [];
    }

    return roles.map((role: any) => ({
      roleId: role.role_id,
      chainOrder: role.chain_order
    }));
  } catch (error) {
    console.error('Error building response chain:', error);
    throw error;
  }
}