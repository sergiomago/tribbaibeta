
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { Message } from "@/types";
import { Database } from "@/integrations/supabase/types";

type MessageResponse = Database['public']['Tables']['messages']['Row'] & {
  role: Pick<Database['public']['Tables']['roles']['Row'], 'name' | 'tag' | 'special_capabilities'> | null;
};

export function useMessages(threadId: string | null) {
  const { data: messages, refetch: refetchMessages, isLoading: isLoadingMessages } = useQuery({
    queryKey: ["messages", threadId],
    queryFn: async () => {
      if (!threadId) return [];
      const { data, error } = await supabase
        .from("messages")
        .select(`
          *,
          role:roles(
            name, 
            tag,
            special_capabilities
          )
        `)
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      
      // Transform the response to match our Message type
      return ((data || []) as unknown as MessageResponse[]).map(msg => ({
        id: msg.id,
        thread_id: msg.thread_id,
        role_id: msg.role_id,
        content: msg.content,
        created_at: msg.created_at,
        tagged_role_id: msg.tagged_role_id,
        role: msg.role ? {
          name: msg.role.name,
          tag: msg.role.tag,
          special_capabilities: msg.role.special_capabilities
        } : undefined
      })) as Message[];
    },
    enabled: !!threadId,
  });

  useEffect(() => {
    if (!threadId) return;

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `thread_id=eq.${threadId}`,
        },
        () => {
          refetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId, refetchMessages]);

  return { messages, refetchMessages, isLoadingMessages };
}
