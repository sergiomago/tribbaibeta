
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
      
      // First get messages without role information
      const { data: dbMessages, error: msgError } = await supabase
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
          chain_order
        `)
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true });

      if (msgError) {
        console.error("Error fetching messages:", msgError);
        return [];
      }

      if (!dbMessages?.length) return [];

      // Then get role information separately for all role_ids
      const roleIds = dbMessages
        .map(msg => msg.role_id)
        .filter((id): id is string => !!id);

      const { data: roleData, error: roleError } = await supabase
        .from("roles")
        .select("id, name, tag, special_capabilities")
        .in("id", roleIds);

      if (roleError) {
        console.error("Error fetching roles:", roleError);
      }

      // Create a map of roles for easy lookup
      const rolesMap = new Map(roleData?.map(role => [role.id, role]) || []);

      // Transform messages with role information
      const enrichedMessages = dbMessages.map(message => ({
        id: message.id,
        thread_id: message.thread_id,
        role_id: message.role_id,
        content: message.content,
        created_at: message.created_at,
        tagged_role_id: message.tagged_role_id,
        role: message.role_id ? {
          name: rolesMap.get(message.role_id)?.name || "Unknown Role",
          tag: rolesMap.get(message.role_id)?.tag || "unknown",
          special_capabilities: rolesMap.get(message.role_id)?.special_capabilities || []
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
    staleTime: 1000, // Time before data is considered stale
    gcTime: 5000,    // Renamed from cacheTime to gcTime in v5
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
          // Only invalidate if the change is relevant
          if (payload.eventType === 'INSERT' || 
              (payload.eventType === 'UPDATE' && payload.new?.content !== payload.old?.content)) {
            queryClient.invalidateQueries({ queryKey: ["messages", threadId] });
          }
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

// Helper function to transform metadata to correct type
function transformMetadata(metadata: Json | null): MessageMetadata {
  if (!metadata || typeof metadata !== 'object') {
    return {};
  }

  // Ensure the metadata matches our MessageMetadata type
  const transformed: MessageMetadata = {
    ...(metadata as Record<string, any>),
  };

  return transformed;
}
