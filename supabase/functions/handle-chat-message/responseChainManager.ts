import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { ResponseChain } from "./types.ts";

function calculateSimpleScore(
  role: any,
  content: string,
  expertise_areas: string[],
  primary_topics: string[]
): number {
  // Topic Match (0.4) - Check if content matches role's expertise
  const topicMatch = expertise_areas?.some(area => 
    content.toLowerCase().includes(area.toLowerCase())
  ) ? 1 : 0;

  // Role Relevance (0.3) - Based on primary topics
  const roleRelevance = primary_topics?.some(topic =>
    content.toLowerCase().includes(topic.toLowerCase())
  ) ? 1 : 0;

  // Response Order (0.3) - Default to 1 for now, will be adjusted by position
  const orderScore = 1;

  return (
    topicMatch * 0.4 +
    roleRelevance * 0.3 +
    orderScore * 0.3
  );
}

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
      const { data: threadRole } = await supabase
        .from('thread_roles')
        .select('role_id')
        .eq('thread_id', threadId)
        .eq('role_id', taggedRoleId)
        .single();

      if (!threadRole) {
        console.log('Tagged role not found in thread');
        return [];
      }

      return [{
        roleId: taggedRoleId,
        chainOrder: 1
      }];
    }

    // Get thread roles with their expertise areas and primary topics
    const { data: threadRoles, error: threadRolesError } = await supabase
      .from('thread_roles')
      .select(`
        role_id,
        roles (
          expertise_areas,
          primary_topics
        )
      `)
      .eq('thread_id', threadId);

    if (threadRolesError) throw threadRolesError;
    
    if (!threadRoles?.length) {
      console.log('No roles found for thread');
      return [];
    }

    // Score and sort roles
    const scoredRoles = threadRoles.map(tr => ({
      roleId: tr.role_id,
      score: calculateSimpleScore(
        tr.roles,
        content,
        tr.roles?.expertise_areas || [],
        tr.roles?.primary_topics || []
      )
    }));

    // Sort by score and convert to chain format
    const chain = scoredRoles
      .sort((a, b) => b.score - a.score)
      .map((role, index) => ({
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