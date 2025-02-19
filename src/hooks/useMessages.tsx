
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

      const enrichedMessages = dbMessages.map(message => ({
        id: message.id,
        thread_id: message.thread_id,
        role_id: message.role_id,
        content: message.content,
        created_at: message.created_at,
        tagged_role_id: message.tagged_role_id,
        role: message.role,
        metadata: message.metadata,
        parent: message.parent?.[0] ? {
          id: message.parent[0].id,
          content: message.parent[0].content
        } : null,
        depth_level: message.depth_level,
        parent_message_id: message.parent_message_id,
        chain_position: message.chain_position,
        chain_id: message.chain_id,
        chain_order: message.chain_order,
        relationships: relationships.filter(r => r.parent_message_id === message.id)
      })) as Message[];

      return enrichedMessages;
    },
    enabled: !!threadId,
    refetchInterval: 1000, // Poll every second for updates while streaming
  });

  useEffect(() => {
    if (!threadId) return;

    const channel = supabase
      .channel('messages-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `thread_id=eq.${threadId}`,
        },
        () => {
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
