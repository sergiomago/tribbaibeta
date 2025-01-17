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
    const { error } = await supabase
      .from('role_interactions')
      .insert({
        thread_id: this.threadId,
        initiator_role_id: initiatorRoleId,
        responder_role_id: responderRoleId,
        interaction_type: type,
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
}