
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

interface Role {
  id: string;
  name: string;
  instructions: string;
  expertise_areas: string[];
  special_capabilities: string[];
  model: string;
}

export async function selectResponders(supabase: any, content: string, threadId: string, taggedRoleId?: string) {
  try {
    console.log("Selecting responders for:", { content, threadId, taggedRoleId });

    // If a role is tagged, verify it exists in the thread
    if (taggedRoleId) {
      const { data: taggedRole } = await supabase
        .from('thread_roles')
        .select(`
          role:roles (
            id,
            name,
            instructions,
            expertise_areas,
            special_capabilities,
            model
          )
        `)
        .eq('thread_id', threadId)
        .eq('role_id', taggedRoleId)
        .single();

      if (taggedRole?.role) {
        console.log("Tagged role found:", taggedRole.role);
        return [taggedRole.role];
      }
      console.log("Tagged role not found in thread");
    }

    // Get all roles in the thread with their details
    const { data: threadRoles, error } = await supabase
      .from('thread_roles')
      .select(`
        role:roles (
          id,
          name,
          instructions,
          expertise_areas,
          special_capabilities,
          model
        )
      `)
      .eq('thread_id', threadId);

    if (error) throw error;

    if (!threadRoles?.length) {
      console.log("No roles found in thread");
      return [];
    }

    // Calculate relevance scores for each role
    const scoredRoles = threadRoles.map(tr => {
      const role = tr.role;
      const score = calculateRelevanceScore(role, content);
      return { role, score };
    });

    // Sort by relevance score and return roles
    return scoredRoles
      .sort((a, b) => b.score - a.score)
      .map(sr => sr.role);

  } catch (error) {
    console.error("Error in selectResponders:", error);
    throw error;
  }
}

function calculateRelevanceScore(role: Role, content: string): number {
  let score = 0;

  // Check expertise areas match
  if (role.expertise_areas) {
    score += role.expertise_areas.reduce((sum, area) => {
      return sum + (content.toLowerCase().includes(area.toLowerCase()) ? 0.3 : 0);
    }, 0);
  }

  // Check for special capability keywords
  if (role.special_capabilities) {
    const capabilityKeywords = {
      'web_search': ['search', 'find', 'lookup', 'research'],
      'doc_analysis': ['analyze', 'document', 'read', 'extract']
    };

    score += role.special_capabilities.reduce((sum, cap) => {
      const keywords = capabilityKeywords[cap as keyof typeof capabilityKeywords] || [];
      return sum + (keywords.some(k => content.toLowerCase().includes(k)) ? 0.4 : 0);
    }, 0);
  }

  return Math.min(score, 1); // Normalize to 0-1 range
}
