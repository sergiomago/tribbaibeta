import { SupabaseClient } from '@supabase/supabase-js';
import { RoleChainMember } from './types.ts';

export async function getRoleChain(
  supabase: SupabaseClient,
  threadId: string,
  taggedRoleId?: string | null
): Promise<RoleChainMember[]> {
  try {
    // If a specific role is tagged, return only that role
    if (taggedRoleId) {
      const { data: roleExists } = await supabase
        .from('thread_roles')
        .select('role_id')
        .eq('thread_id', threadId)
        .eq('role_id', taggedRoleId)
        .single();

      if (roleExists) {
        return [{ role_id: taggedRoleId, order: 1 }];
      }
    }

    // Otherwise, get all roles in the thread ordered by creation
    const { data: roles, error } = await supabase
      .from('thread_roles')
      .select('role_id, created_at')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    if (!roles || roles.length === 0) {
      throw new Error("No roles found in thread");
    }

    // Map roles to chain members with order
    return roles.map((role, index) => ({
      role_id: role.role_id,
      order: index + 1
    }));

  } catch (error) {
    console.error("Error getting role chain:", error);
    throw error;
  }
}
