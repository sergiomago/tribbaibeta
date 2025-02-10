
import { Role } from "../types/roles";
import { supabase } from "@/integrations/supabase/client";
import { generateEmbedding } from "@/services/embedding-generator";

export class RelevanceScorer {
  async calculateScore(role: Role, content: string, threadId: string): Promise<number> {
    const [contextScore, interactionScore, capabilityScore] = await Promise.all([
      this.calculateContextRelevance(role, content),
      this.calculateInteractionHistory(role.id, threadId),
      this.calculateCapabilityMatch(role, content)
    ]);

    // Weighted scoring
    return (
      contextScore * 0.4 +
      interactionScore * 0.3 +
      capabilityScore * 0.3
    );
  }

  private async calculateContextRelevance(role: Role, content: string): Promise<number> {
    try {
      // Generate embedding for the content
      const embedding = await generateEmbedding(content);
      if (!embedding || embedding.length === 0) {
        console.warn('Failed to generate embedding for content');
        return 0;
      }

      const { data: memories } = await supabase
        .rpc('get_similar_memories', {
          p_embedding: embedding,
          p_match_threshold: 0.7,
          p_match_count: 5,
          p_role_id: role.id
        });

      if (!memories?.length) return 0;
      return memories.reduce((acc, mem) => acc + mem.similarity, 0) / memories.length;
    } catch (error) {
      console.error('Error calculating context relevance:', error);
      return 0;
    }
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

    // Simple keyword matching for capabilities
    const keywords = {
      'web_search': ['search', 'find', 'lookup', 'research'],
      'doc_analysis': ['analyze', 'document', 'read', 'extract']
    };

    let matches = 0;
    role.special_capabilities.forEach(cap => {
      if (keywords[cap]?.some(keyword => 
        content.toLowerCase().includes(keyword.toLowerCase())
      )) {
        matches++;
      }
    });

    return matches / role.special_capabilities.length;
  }
}
