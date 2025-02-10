
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { ResponseChain } from "./types.ts";

function calculateExpertiseScore(content: string, expertise_areas: string[]): number {
  if (!expertise_areas?.length) return 0;
  
  const normalizedContent = content.toLowerCase();
  let exactMatches = 0;
  let partialMatches = 0;

  expertise_areas.forEach(area => {
    const normalizedArea = area.toLowerCase();
    if (normalizedContent.includes(normalizedArea)) {
      exactMatches++;
    } else {
      // Check for partial matches (individual words)
      const areaWords = normalizedArea.split(' ');
      const hasPartialMatch = areaWords.some(word => 
        word.length > 3 && normalizedContent.includes(word)
      );
      if (hasPartialMatch) partialMatches++;
    }
  });

  // Exact matches are weighted higher than partial matches
  return (exactMatches * 0.7 + partialMatches * 0.3) / Math.max(expertise_areas.length, 1);
}

function calculateTopicRelevance(content: string, primary_topics: string[]): number {
  if (!primary_topics?.length) return 0;

  const normalizedContent = content.toLowerCase();
  const matchingTopics = primary_topics.filter(topic =>
    normalizedContent.includes(topic.toLowerCase())
  );

  return matchingTopics.length / primary_topics.length;
}

function calculateStyleMatch(content: string, responseStyle: any): number {
  if (!responseStyle) return 0.5; // Default middle score if no style defined

  // Simple content analysis for style matching
  const isDetailedQuestion = content.length > 100 || 
    content.includes('explain') || 
    content.includes('detail');

  const isQuickQuestion = content.includes('quickly') || 
    content.includes('brief') || 
    content.toLowerCase().split(' ').length < 10;

  // Match detailed questions with detailed response styles
  if (isDetailedQuestion && responseStyle.complexity === 'detailed') return 1;
  if (isQuickQuestion && responseStyle.complexity === 'simple') return 1;
  
  return 0.5; // Neutral score for no strong style match
}

function calculateSimpleScore(
  role: any,
  content: string
): number {
  // Calculate individual scores
  const expertiseScore = calculateExpertiseScore(content, role.expertise_areas || []);
  const topicScore = calculateTopicRelevance(content, role.primary_topics || []);
  const styleScore = calculateStyleMatch(content, role.response_style);

  // Weight the scores
  const weights = {
    expertise: 0.5,    // Highest weight for expertise match
    topic: 0.3,        // Good weight for topic relevance
    style: 0.2         // Lower weight for style matching
  };

  console.log(`Scoring role ${role.id}:`, {
    expertiseScore,
    topicScore,
    styleScore,
    finalScore: (
      expertiseScore * weights.expertise +
      topicScore * weights.topic +
      styleScore * weights.style
    )
  });

  return (
    expertiseScore * weights.expertise +
    topicScore * weights.topic +
    styleScore * weights.style
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
          id,
          expertise_areas,
          primary_topics,
          response_style
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
      score: calculateSimpleScore(tr.roles, content)
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
