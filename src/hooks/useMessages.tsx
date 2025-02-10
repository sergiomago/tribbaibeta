
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { Message } from "@/types";

export function useMessages(threadId: string | null) {
  const { data: messages, refetch: refetchMessages, isLoading: isLoadingMessages } = useQuery({
    queryKey: ["messages", threadId],
    queryFn: async () => {
      if (!threadId) return [];
      const { data, error } = await supabase
        .from("messages")
        .select(`
          id,
          thread_id,
          role_id,
          responding_role_id,
          is_bot,
          content,
          created_at,
          thread_depth,
          parent_message_id,
          tagged_role_id,
          metadata,
          role:roles!messages_role_id_fkey(
            name,
            tag,
            special_capabilities
          )
        `)
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Transform the data to ensure it matches the Message type
      const typedMessages = data.map(msg => ({
        id: msg.id,
        thread_id: msg.thread_id,
        role_id: msg.role_id,
        responding_role_id: msg.responding_role_id,
        content: msg.content,
        created_at: msg.created_at,
        is_bot: msg.is_bot || false,
        parent_message_id: msg.parent_message_id,
        thread_depth: msg.thread_depth || 0,
        tagged_role_id: msg.tagged_role_id,
        metadata: msg.metadata,
        role: msg.role ? {
          name: msg.role.name,
          tag: msg.role.tag
        } : undefined
      })) as Message[];

      return typedMessages;
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
