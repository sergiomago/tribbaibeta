
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { Message, MessageMetadata } from "@/types";
import { useRoleMind } from "./useRoleMind";
import { Json } from "@/integrations/supabase/types";

export function useMessages(threadId: string | null, roleId: string | null) {
  const queryClient = useQueryClient();
  const roleMind = useRoleMind(roleId);

  const { data: messages, isLoading: isLoadingMessages } = useQuery({
    queryKey: ["messages", threadId],
    queryFn: async () => {
      if (!threadId) return [];
      
      console.log('Fetching messages for thread:', threadId);
      
      // Get messages and roles in a single query to reduce race conditions
      const { data: dbMessages, error: msgError } = await supabase
        .from("messages")
        .select(`
          *,
          role:roles (
            id,
            name,
            tag,
            special_capabilities
          )
        `)
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true });

      if (msgError) {
        console.error("Error fetching messages:", msgError);
        return [];
      }

      if (!dbMessages?.length) return [];

      // Transform messages with embedded role information
      const enrichedMessages = dbMessages.map(message => ({
        id: message.id,
        thread_id: message.thread_id,
        role_id: message.role_id,
        content: message.content,
        created_at: message.created_at,
        tagged_role_id: message.tagged_role_id,
        role: message.role ? {
          name: message.role.name,
          tag: message.role.tag,
          special_capabilities: message.role.special_capabilities
        } : undefined,
        metadata: transformMetadata(message.metadata),
        depth_level: message.depth_level || 0,
        parent_message_id: message.parent_message_id,
        chain_position: message.chain_position || 0,
        chain_id: message.chain_id,
        chain_order: message.chain_order || 0
      })) satisfies Message[];

      return enrichedMessages;
    },
    enabled: !!threadId,
    staleTime: 1000,
    gcTime: 5000,
  });

  useEffect(() => {
    if (!threadId) return;

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
        async (payload) => {
          console.log('Message change received:', payload);
          
          // For updates, only invalidate if content or metadata changed
          if (payload.eventType === 'UPDATE') {
            const oldContent = payload.old?.content;
            const newContent = payload.new?.content;
            const oldMetadata = payload.old?.metadata;
            const newMetadata = payload.new?.metadata;
            
            if (oldContent === newContent && 
                JSON.stringify(oldMetadata) === JSON.stringify(newMetadata)) {
              return;
            }
          }
          
          // Use setQueryData for better performance
          const previousData = queryClient.getQueryData<Message[]>(["messages", threadId]);
          if (previousData) {
            if (payload.eventType === 'INSERT') {
              // Fetch the complete message with role information
              const { data: newMessage } = await supabase
                .from("messages")
                .select(`
                  *,
                  role:roles (
                    id,
                    name,
                    tag,
                    special_capabilities
                  )
                `)
                .eq("id", payload.new.id)
                .single();

              if (newMessage) {
                const enrichedMessage = {
                  ...newMessage,
                  role: newMessage.role ? {
                    name: newMessage.role.name,
                    tag: newMessage.role.tag,
                    special_capabilities: newMessage.role.special_capabilities
                  } : undefined,
                  metadata: transformMetadata(newMessage.metadata)
                } as Message;

                queryClient.setQueryData(
                  ["messages", threadId],
                  [...previousData, enrichedMessage]
                );
              }
            } else if (payload.eventType === 'UPDATE') {
              queryClient.setQueryData(
                ["messages", threadId],
                previousData.map(msg => 
                  msg.id === payload.new.id 
                    ? { ...msg, ...payload.new } 
                    : msg
                )
              );
            }
          } else {
            // If we don't have the data cached, invalidate the query
            queryClient.invalidateQueries({ queryKey: ["messages", threadId] });
          }
        }
      )
      .subscribe();

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

function transformMetadata(metadata: Json | null): MessageMetadata {
  if (!metadata || typeof metadata !== 'object') {
    return {};
  }
  return metadata as MessageMetadata;
}
