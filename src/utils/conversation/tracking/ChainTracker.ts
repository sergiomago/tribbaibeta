import { supabase } from "@/integrations/supabase/client";

export class ChainTracker {
  private threadId: string;

  constructor(threadId: string) {
    this.threadId = threadId;
  }

  async getMessages(): Promise<any[]> {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        role:roles!messages_role_id_fkey(name, tag)
      `)
      .eq('thread_id', this.threadId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async getCurrentDepth(): Promise<number> {
    const { data, error } = await supabase
      .from('messages')
      .select('id')
      .eq('thread_id', this.threadId);

    if (error) throw error;
    return data?.length || 0;
  }
}