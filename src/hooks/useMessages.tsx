
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
      
      // Fetch messages from Supabase
      const { data: dbMessages, error } = await supabase
        .from("messages")
        .select(`
          *,
          role:roles!messages_role_id_fkey(
            name, 
            tag,
            special_capabilities
          )
        `)
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true });
      
      if (error) throw error;

      return dbMessages as Message[];
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
