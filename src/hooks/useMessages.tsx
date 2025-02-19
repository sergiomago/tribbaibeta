
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { Message } from "@/types";
import { useRoleMind } from "./useRoleMind";

export function useMessages(threadId: string | null, roleId: string | null) {
  const queryClient = useQueryClient();
  const roleMind = useRoleMind(roleId);

  const { data: messages, isLoading: isLoadingMessages } = useQuery({
    queryKey: ["messages", threadId],
    queryFn: async () => {
      if (!threadId) return [];
      
      // Fetch messages with chain information
      const { data: dbMessages, error } = await supabase
        .from("messages")
        .select(`
          *,
          role:roles!messages_role_id_fkey(
            name, 
            tag,
            special_capabilities
          ),
          parent:messages!messages_parent_message_id_fkey(
            id,
            content
          )
        `)
        .eq("thread_id", threadId)
        .order("chain_position", { ascending: true })
        .order("created_at", { ascending: true });
      
      if (error) throw error;

      // Fetch message relationships
      const { data: relationships, error: relError } = await supabase
        .from("message_relationships")
        .select("*")
        .in("parent_message_id", dbMessages.map(m => m.id));

      if (relError) throw relError;

      // Enrich messages with relationship data
      const enrichedMessages = dbMessages.map(message => ({
        ...message,
        relationships: relationships.filter(r => r.parent_message_id === message.id)
      }));

      return enrichedMessages as Message[];
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
        async (payload) => {
          queryClient.invalidateQueries({ queryKey: ["messages", threadId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId, queryClient]);

  const refetchMessages = () => {
    queryClient.invalidateQueries({ queryKey: ["messages", threadId] });
  };

  return { 
    messages, 
    refetchMessages, 
    isLoadingMessages 
  };
}
