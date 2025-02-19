
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
      
      console.log('Fetching messages for thread:', threadId);
      
      // Fetch messages
      const { data: dbMessages, error } = await supabase
        .from("messages")
        .select(`
          id,
          thread_id,
          role_id,
          content,
          created_at,
          tagged_role_id,
          metadata,
          depth_level,
          parent_message_id,
          chain_position,
          chain_id,
          chain_order,
          role:roles (
            id,
            name,
            tag,
            special_capabilities
          )
        `)
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true });
      
      if (error) {
        console.error("Error fetching messages:", error);
        return [];
      }

      console.log('Fetched messages:', dbMessages);

      // Transform messages to include required fields
      const enrichedMessages = (dbMessages || []).map(message => ({
        id: message.id,
        thread_id: message.thread_id,
        role_id: message.role_id,
        content: message.content,
        created_at: message.created_at,
        tagged_role_id: message.tagged_role_id,
        role: message.role,
        metadata: message.metadata || {},
        depth_level: message.depth_level || 0,
        parent_message_id: message.parent_message_id,
        chain_position: message.chain_position || 0,
        chain_id: message.chain_id,
        chain_order: message.chain_order || 0,
        relationships: []
      })) as Message[];

      return enrichedMessages;
    },
    enabled: !!threadId,
    refetchInterval: 1000,
    staleTime: 0,
    retry: 3,
    retryDelay: 1000,
  });

  useEffect(() => {
    if (!threadId) return;

    // Subscribe to message changes
    const channel = supabase
      .channel(`messages-${threadId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `thread_id=eq.${threadId}`,
        },
        (payload) => {
          console.log('Message change received:', payload);
          queryClient.invalidateQueries({ queryKey: ["messages", threadId] });
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId, queryClient]);

  return { 
    messages: messages || [], 
    refetchMessages: () => queryClient.invalidateQueries({ queryKey: ["messages", threadId] }), 
    isLoadingMessages 
  };
}
