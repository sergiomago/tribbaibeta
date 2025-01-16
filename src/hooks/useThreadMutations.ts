import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useThreadMutations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createThread = useMutation({
    mutationFn: async ({ userId, roleId }: { userId: string, roleId?: string }) => {
      // First create the thread
      const { data: thread, error: threadError } = await supabase
        .from("threads")
        .insert({
          name: "New Chat",
          user_id: userId,
        })
        .select()
        .single();

      if (threadError) throw threadError;

      // If a roleId was provided, associate it with the thread
      if (roleId) {
        const { error: roleError } = await supabase
          .from("thread_roles")
          .insert({
            thread_id: thread.id,
            role_id: roleId,
          });

        if (roleError) throw roleError;
      }

      return thread;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["threads"] });
      toast({
        title: "Success",
        description: "New chat created",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create chat: " + error.message,
        variant: "destructive",
      });
    },
  });

  const updateThreadName = useMutation({
    mutationFn: async ({ threadId, name }: { threadId: string; name: string }) => {
      const { error } = await supabase
        .from("threads")
        .update({ name })
        .eq("id", threadId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["threads"] });
      toast({
        title: "Success",
        description: "Chat name updated",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update chat name: " + error.message,
        variant: "destructive",
      });
    },
  });

  const deleteThread = useMutation({
    mutationFn: async (threadId: string) => {
      const { error } = await supabase
        .from("threads")
        .delete()
        .eq("id", threadId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["threads"] });
      toast({
        title: "Success",
        description: "Chat deleted",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete chat: " + error.message,
        variant: "destructive",
      });
    },
  });

  return {
    createThread,
    updateThreadName,
    deleteThread,
  };
}