
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { Message } from "@/types";
import { useRoleMind } from "./useRoleMind";

export function useMessages(threadId: string | null, roleId: string | null) {
  const queryClient = useQueryClient();
  const { mind } = useRoleMind(roleId);

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

      // If we have a mind, enrich messages with Llongterm context
      if (mind && dbMessages) {
        const context = await mind.ask(dbMessages.map(m => m.content).join('\n'));
        return dbMessages.map(msg => ({
          ...msg as object,
          metadata: {
            ...(msg.metadata || {}),
            llongterm_context: context.relevantMemories
              .filter(m => m.includes(msg.content))
              .map(m => ({ content: m }))
          }
        })) as Message[];
      }

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
          // When a new message arrives, update cache and store in Llongterm if available
          queryClient.invalidateQueries({ queryKey: ["messages", threadId] });
          
          if (mind && payload.new) {
            try {
              await mind.remember([{
                author: payload.new.role_id ? 'assistant' : 'user',
                message: payload.new.content,
                metadata: {
                  messageId: payload.new.id,
                  threadId: payload.new.thread_id,
                  timestamp: payload.new.created_at
                }
              }]);
            } catch (error) {
              console.error('Failed to store message in Llongterm:', error);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId, mind, queryClient]);

  const refetchMessages = () => {
    queryClient.invalidateQueries({ queryKey: ["messages", threadId] });
  };

  return { 
    messages, 
    refetchMessages, 
    isLoadingMessages 
  };
}
