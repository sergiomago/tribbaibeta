import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Message, Role } from "./types.ts";

export async function buildConversationContext(
  supabase: SupabaseClient,
  threadId: string,
  roleId: string,
  previousResponses: Message[]
) {
  // Get role details
  const { data: role } = await supabase
    .from('roles')
    .select('*')
    .eq('id', roleId)
    .single();

  if (!role) throw new Error('Role not found');

  // Get other roles in the thread
  const { data: threadRoles } = await supabase
    .from('thread_roles')
    .select('roles(*)')
    .eq('thread_id', threadId)
    .neq('role_id', roleId);

  // Get the sequence of roles
  const roleSequence = threadRoles?.map(tr => tr.roles.name).join('\n') || '';

  // Find current role's position and adjacent roles
  const allRoles = threadRoles?.map(tr => tr.roles) || [];
  const currentPosition = allRoles.findIndex(r => r.id === roleId) + 1;
  const previousRole = currentPosition > 1 ? allRoles[currentPosition - 2]?.name : 'none';
  const nextRole = currentPosition < allRoles.length ? allRoles[currentPosition]?.name : 'none';

  // Format previous responses for context
  const formattedResponses = previousResponses
    .map(msg => {
      const roleName = msg.role?.name || 'Unknown';
      return `${roleName}: ${msg.content}`;
    })
    .join('\n\n');

  return {
    role,
    roleSequence,
    currentPosition,
    previousRole,
    nextRole,
    formattedResponses
  };
}