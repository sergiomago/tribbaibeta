import { supabase } from "@/integrations/supabase/client";

export class InteractionTracker {
  private threadId: string;

  constructor(threadId: string) {
    this.threadId = threadId;
  }

  async trackInteraction(
    initiatorRoleId: string,
    responderRoleId: string,
    type: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    const { data: depth } = await supabase.rpc(
      'get_conversation_depth',
      { 
        p_thread_id: this.threadId,
        p_role_id: initiatorRoleId
      }
    );

    // Calculate simplified scores
    const expertiseMatchScore = metadata.expertiseMatch ? 1.0 : 0.0;
    const contextMatchScore = metadata.contextMatch ? 1.0 : 0.0;
    const interactionSuccess = metadata.success ?? true;

    const { error } = await supabase
      .from('role_interactions')
      .insert({
        thread_id: this.threadId,
        initiator_role_id: initiatorRoleId,
        responder_role_id: responderRoleId,
        interaction_type: type,
        conversation_depth: (depth || 0) + 1,
        expertise_match_score: expertiseMatchScore,
        context_match_score: contextMatchScore,
        interaction_success: interactionSuccess,
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString(),
        }
      });

    if (error) throw error;
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
}