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
    // Verify thread exists
    const { data: thread, error: threadError } = await supabase
      .from('threads')
      .select('id')
      .eq('id', threadId)
      .single();

    if (threadError || !thread) {
      console.error('Thread verification failed:', threadError);
      throw new Error('Invalid thread ID');
    }

    // If a role is tagged, verify it exists and is assigned to the thread
    if (taggedRoleId) {
      const { data: taggedRole, error: taggedRoleError } = await supabase
        .from('thread_roles')
        .select('role_id')
        .eq('thread_id', threadId)
        .eq('role_id', taggedRoleId)
        .single();

      if (taggedRoleError || !taggedRole) {
        console.error('Tagged role verification failed:', taggedRoleError);
        throw new Error('Invalid tagged role');
      }

      console.log('Tagged role response chain');
      return [{
        roleId: taggedRoleId,
        chainOrder: 1
      }];
    }

    // Get best responding roles based on context with improved error handling
    const { data: roles, error: rolesError } = await supabase.rpc(
      'get_best_responding_role',
      { 
        p_thread_id: threadId,
        p_context: content,
        p_threshold: 0.3,
        p_max_roles: 3
      }
    );

    if (rolesError) {
      console.error('Error getting responding roles:', rolesError);
      throw new Error('Failed to determine responding roles');
    }

    if (!roles?.length) {
      console.log('No roles found for thread');
      return [];
    }

    console.log('Selected responding roles:', roles);
    return roles.map((role: any) => ({
      roleId: role.role_id,
      chainOrder: role.chain_order
    }));

  } catch (error) {
    console.error('Error building response chain:', error);
    throw error;
  }
}