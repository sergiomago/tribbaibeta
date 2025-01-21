import { supabase } from "@/integrations/supabase/client";

export class ChainTracker {
  private threadId: string;

  constructor(threadId: string) {
    this.threadId = threadId;
  }

  async trackMessageInChain(
    messageId: string,
    chainId: string,
    order: number
  ): Promise<void> {
    const { error } = await supabase
      .from('messages')
      .update({
        chain_id: chainId,
        chain_order: order
      })
      .eq('id', messageId);

    if (error) throw error;
  }

  async getChainMessages(chainId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        role:roles!messages_role_id_fkey(name, tag)
      `)
      .eq('chain_id', chainId)
      .order('chain_order', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async getCurrentChain(): Promise<string | null> {
    const { data, error } = await supabase
      .from('messages')
      .select('chain_id')
      .eq('thread_id', this.threadId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data?.chain_id || null;
  }

  async getChainDepth(chainId: string): Promise<number> {
    const { data, error } = await supabase
      .from('messages')
      .select('chain_order')
      .eq('chain_id', chainId)
      .order('chain_order', { ascending: false })
      .limit(1)
      .single();

    if (error) throw error;
    return data?.chain_order || 0;
  }
}