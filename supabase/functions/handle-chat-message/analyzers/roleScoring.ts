
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { AnalysisResult, RoleScore } from './types.ts';

export async function scoreRoles(
  supabase: SupabaseClient,
  roleIds: string[],
  analysis: AnalysisResult
): Promise<RoleScore[]> {
  // Get roles information
  const { data: roles } = await supabase
    .from('roles')
    .select('id, name, expertise_areas, instructions')
    .in('id', roleIds);

  if (!roles) {
    console.log('No roles found for scoring');
    return roleIds.map(id => ({ roleId: id, score: 1 }));
  }

  // Score each role based on analysis
  const scoredRoles = roles.map(role => {
    let score = 0;

    // Match expertise areas with domains
    const expertise = role.expertise_areas || [];
    analysis.domains.forEach(domain => {
      if (expertise.some(exp => 
        domain.name.toLowerCase().includes(exp.toLowerCase()) ||
        exp.toLowerCase().includes(domain.name.toLowerCase())
      )) {
        score += domain.confidence;
      }
    });

    // Adjust score based on required expertise match
    analysis.domains.forEach(domain => {
      domain.requiredExpertise.forEach(req => {
        if (expertise.some(exp => exp.toLowerCase().includes(req.toLowerCase()))) {
          score += 0.5;
        }
      });
    });

    return {
      roleId: role.id,
      score: score / (analysis.domains.length * 1.5) // Normalize score
    };
  });

  // Sort by score descending
  return scoredRoles.sort((a, b) => b.score - a.score);
}
