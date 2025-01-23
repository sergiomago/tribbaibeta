import { supabase } from "@/integrations/supabase/client";
import { createLlongtermManager } from "@/utils/LlongtermManager";

export class InteractionTracker {
  private threadId: string;
  private llongterm: ReturnType<typeof createLlongtermManager>;

  constructor(threadId: string) {
    this.threadId = threadId;
    // Initialize with a temporary roleId, will be set per interaction
    this.llongterm = createLlongtermManager('temp', threadId);
  }

  async trackInteraction(
    initiatorRoleId: string,
    responderRoleId: string,
    type: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      const { data: depth } = await supabase.rpc(
        'get_conversation_depth',
        { 
          p_thread_id: this.threadId,
          p_role_id: initiatorRoleId
        }
      );

      // Calculate effectiveness based on metadata and context
      const effectiveness = this.calculateEffectiveness(metadata);

      // Store in database
      const { error } = await supabase
        .from('role_interactions')
        .insert({
          thread_id: this.threadId,
          initiator_role_id: initiatorRoleId,
          responder_role_id: responderRoleId,
          interaction_type: type,
          conversation_depth: (depth || 0) + 1,
          effectiveness_score: effectiveness,
          metadata: {
            ...metadata,
            timestamp: new Date().toISOString(),
          }
        });

      if (error) throw error;

      // Store in LLongterm memory
      this.llongterm = createLlongtermManager(initiatorRoleId, this.threadId);
      await this.llongterm.storeInteractionMemory(
        initiatorRoleId,
        responderRoleId,
        metadata.content || '',
        effectiveness
      );

      console.log('Interaction tracked successfully:', {
        initiatorRoleId,
        responderRoleId,
        effectiveness
      });
    } catch (error) {
      console.error('Error tracking interaction:', error);
      throw error;
    }
  }

  private calculateEffectiveness(metadata: Record<string, any>): number {
    // Calculate effectiveness score based on various factors
    const baseScore = 0.5; // Default middle score
    let finalScore = baseScore;

    // Adjust based on response quality if available
    if (metadata.response_quality) {
      finalScore += metadata.response_quality * 0.3;
    }

    // Adjust based on context relevance if available
    if (metadata.context_relevance) {
      finalScore += metadata.context_relevance * 0.2;
    }

    // Ensure score is between 0 and 1
    return Math.max(0, Math.min(1, finalScore));
  }

  async getInteractionHistory(): Promise<any[]> {
    const { data, error } = await supabase
      .from('role_interactions')
      .select(`
        *,
        initiator:roles!role_interactions_initiator_role_id_fkey(name),
        responder:roles!role_interactions_responder_role_id_fkey(name)
      `)
      .eq('thread_id', this.threadId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async getInteractionContext(roleId: string): Promise<any[]> {
    // Get both database and memory context
    const [dbContext, memoryContext] = await Promise.all([
      this.getDatabaseContext(roleId),
      this.getMemoryContext(roleId)
    ]);

    return [...dbContext, ...memoryContext];
  }

  private async getDatabaseContext(roleId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('role_interactions')
      .select('*')
      .eq('thread_id', this.threadId)
      .or(`initiator_role_id.eq.${roleId},responder_role_id.eq.${roleId}`)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) throw error;
    return data || [];
  }

  private async getMemoryContext(roleId: string): Promise<any[]> {
    this.llongterm = createLlongtermManager(roleId, this.threadId);
    return await this.llongterm.getInteractionMemories(roleId, '');
  }
}