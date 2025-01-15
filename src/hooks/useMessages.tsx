import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

interface Message {
  id: string;
  thread_id: string;
  role_id: string | null;
  content: string;
  created_at: string;
  response_order: number | null;
  role?: {
    name: string;
    tag: string;
  } | null;
}

export function useMessages(threadId: string | null) {
  const queryClient = useQueryClient();

  const { data: messages, isLoading: isLoadingMessages } = useQuery({
    queryKey: ["messages", threadId],
    queryFn: async () => {
      if (!threadId) return [];
      const { data, error } = await supabase
        .from("messages")
        .select(`
          *,
          role:roles!messages_role_id_fkey(name, tag)
        `)
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Message[];
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
        (payload) => {
          // Get the current messages from the cache
          const currentMessages = queryClient.getQueryData<Message[]>(["messages", threadId]) || [];
          
          // Fetch the role information for the new message if it has a role_id
          if (payload.new.role_id) {
            supabase
              .from('roles')
              .select('name, tag')
              .eq('id', payload.new.role_id)
              .single()
              .then(({ data: role }) => {
                // Create the new message with role information
                const newMessage = {
                  ...payload.new,
                  role: role || null
                } as Message;

                // Update the cache with the new message
                queryClient.setQueryData(["messages", threadId], [...currentMessages, newMessage]);
              });
          } else {
            // If no role_id, just add the message directly
            const newMessage = {
              ...payload.new,
              role: null
            } as Message;
            
            // Update the cache with the new message
            queryClient.setQueryData(["messages", threadId], [...currentMessages, newMessage]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId, queryClient]);

  return { messages, isLoadingMessages };
}