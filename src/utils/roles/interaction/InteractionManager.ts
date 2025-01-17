import { supabase } from "@/integrations/supabase/client";
import { Role } from "../types/roles";

export class InteractionManager {
  private threadId: string;

  constructor(threadId: string) {
    this.threadId = threadId;
  }

  async recordInteraction(
    initiatorRoleId: string,
    responderRoleId: string,
    interactionType: string,
    metadata: Record<string, any> = {}
  ) {
    const { data: depth } = await supabase.rpc(
      'get_conversation_depth',
      { 
        p_thread_id: this.threadId,
        p_role_id: initiatorRoleId
      }
    );

    const { data, error } = await supabase
      .from('role_interactions')
      .insert({
        thread_id: this.threadId,
        initiator_role_id: initiatorRoleId,
        responder_role_id: responderRoleId,
        interaction_type: interactionType,
        conversation_depth: (depth || 0) + 1,
        metadata
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getInteractionHistory(roleId: string) {
    const { data, error } = await supabase
      .from('role_interactions')
      .select(`
        *,
        initiator:initiator_role_id(name, tag),
        responder:responder_role_id(name, tag)
      `)
      .eq('thread_id', this.threadId)
      .or(`initiator_role_id.eq.${roleId},responder_role_id.eq.${roleId}`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async getInteractionContext(roleId: string, content: string) {
    const { data: memories } = await supabase
      .rpc('get_similar_memories', {
        p_embedding: content,
        p_match_threshold: 0.7,
        p_match_count: 5,
        p_role_id: roleId
      });

    return memories || [];
  }
}

export const createInteractionManager = (threadId: string) => {
  return new InteractionManager(threadId);
};