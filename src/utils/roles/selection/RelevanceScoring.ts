
import { Role } from "../types/roles";
import { supabase } from "@/integrations/supabase/client";

export class RelevanceScorer {
  async calculateScore(role: Role, content: string, threadId: string): Promise<number> {
    const [contextScore, interactionScore, capabilityScore] = await Promise.all([
      this.calculateContextRelevance(role, content),
      this.calculateInteractionHistory(role.id, threadId),
      this.calculateCapabilityMatch(role, content)
    ]);

    console.log('Scores for role', role.name, ':', {
      contextScore,
      interactionScore,
      capabilityScore,
      content
    });

    // Adjusted weights to prioritize context and capability matching
    return (
      contextScore * 0.5 +          // Increased weight for context relevance
      interactionScore * 0.2 +      // Reduced weight for interaction history
      capabilityScore * 0.3         // Maintained weight for capability matching
    );
  }

  private async calculateContextRelevance(role: Role, content: string): Promise<number> {
    // Check expertise areas match
    const expertiseMatch = role.expertise_areas?.some(area => 
      content.toLowerCase().includes(area.toLowerCase())
    ) ? 0.7 : 0;

    // Check primary topics match
    const topicMatch = role.primary_topics?.some(topic =>
      content.toLowerCase().includes(topic.toLowerCase())
    ) ? 0.3 : 0;

    // Get similar memories for additional context
    const { data: memories } = await supabase
      .rpc('get_similar_memories', {
        p_embedding: content,
        p_match_threshold: 0.7,
        p_match_count: 5,
        p_role_id: role.id
      });

    const memoryScore = memories?.length 
      ? memories.reduce((acc, mem) => acc + mem.similarity, 0) / memories.length
      : 0;

    return Math.max(expertiseMatch + topicMatch, memoryScore);
  }

  private async calculateInteractionHistory(roleId: string, threadId: string): Promise<number> {
    const { count } = await supabase
      .from('role_interactions')
      .select('*', { count: 'exact' })
      .eq('thread_id', threadId)
      .or(`initiator_role_id.eq.${roleId},responder_role_id.eq.${roleId}`);

    return count ? Math.min(count / 10, 1) : 0; // Normalize to 0-1 range
  }

  private async calculateCapabilityMatch(role: Role, content: string): Promise<number> {
    if (!role.special_capabilities?.length) return 0;

    // Enhanced keyword matching for capabilities
    const keywords = {
      'web_search': ['search', 'find', 'lookup', 'research', 'google', 'look up', 'tell me about'],
      'doc_analysis': ['analyze', 'document', 'read', 'extract', 'understand', 'explain', 'breakdown']
    };

    let matches = 0;
    let totalWeight = role.special_capabilities.length;

    role.special_capabilities.forEach(cap => {
      if (keywords[cap]?.some(keyword => 
        content.toLowerCase().includes(keyword.toLowerCase())
      )) {
        matches++;
      }
    });

    return matches / totalWeight;
  }
}
