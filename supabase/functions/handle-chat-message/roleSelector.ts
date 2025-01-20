import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

export class RelevanceScorer {
  private async getKeywordRelevance(instructions: string, content: string): Promise<number> {
    const normalizedContent = content.toLowerCase();
    const normalizedInstructions = instructions.toLowerCase();
    
    // Extract key terms from instructions
    const keyTerms = normalizedInstructions
      .split(/[\s.,!?]+/)
      .filter(term => term.length > 3);
    
    // Count matching terms
    const matchingTerms = keyTerms.filter(term => 
      normalizedContent.includes(term)
    );
    
    return matchingTerms.length / Math.max(keyTerms.length, 1);
  }

  private async getRoleHistory(
    roleId: string,
    threadId: string,
    supabase: SupabaseClient
  ): Promise<number> {
    const { count } = await supabase
      .from('role_interactions')
      .select('*', { count: 'exact' })
      .eq('thread_id', threadId)
      .eq('initiator_role_id', roleId);
    
    // Normalize interaction count (max 10 interactions)
    return Math.min((count || 0) / 10, 1);
  }

  private getCapabilityMatch(capabilities: string[] | null, content: string): number {
    if (!capabilities?.length) return 0;

    const contentLower = content.toLowerCase();
    const relevantKeywords: Record<string, string[]> = {
      'web_search': ['search', 'find', 'look up', 'research'],
      'doc_analysis': ['analyze', 'review', 'document', 'read'],
      'creative': ['create', 'design', 'imagine', 'name', 'brand'],
      'technical': ['code', 'build', 'develop', 'implement'],
      'strategic': ['plan', 'strategy', 'business', 'market']
    };

    let matches = 0;
    capabilities.forEach(cap => {
      const keywords = relevantKeywords[cap] || [];
      if (keywords.some(keyword => contentLower.includes(keyword))) {
        matches++;
      }
    });

    return matches / capabilities.length;
  }

  async calculateRelevance(
    role: any,
    content: string,
    threadId: string,
    supabase: SupabaseClient
  ): Promise<number> {
    const [keywordScore, historyScore, capabilityScore] = await Promise.all([
      this.getKeywordRelevance(role.instructions, content),
      this.getRoleHistory(role.id, threadId, supabase),
      Promise.resolve(this.getCapabilityMatch(role.special_capabilities, content))
    ]);

    // Enhanced weighted scoring with capability emphasis
    const weights = {
      keyword: 0.35,
      history: 0.25,
      capability: 0.4  // Increased weight for capabilities
    };

    return (
      keywordScore * weights.keyword +
      historyScore * weights.history +
      capabilityScore * weights.capability
    );
  }
}