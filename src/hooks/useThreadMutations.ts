import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export function useThreadMutations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const createThread = useMutation({
    mutationFn: async ({ userId, roleId }: { userId: string, roleId?: string }) => {
      const { data: threadData, error: threadError } = await supabase
        .rpc('create_thread_with_state', {
          p_user_id: userId,
          p_role_id: roleId
        });

      if (threadError) throw threadError;
      return threadData;
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