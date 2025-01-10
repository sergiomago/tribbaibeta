import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useRoleMutations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const addRoleToThread = useMutation({
    mutationFn: async ({ threadId, roleId }: { threadId: string; roleId: string }) => {
      const { error } = await supabase
        .from("thread_roles")
        .insert({
          thread_id: threadId,
          role_id: roleId,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["thread-roles"] });
      toast({
        title: "Success",
        description: "Role added to thread",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add role: " + error.message,
        variant: "destructive",
      });
    },
  });

  const removeRoleFromThread = useMutation({
    mutationFn: async ({ threadId, roleId }: { threadId: string; roleId: string }) => {
      const { error } = await supabase
        .from("thread_roles")
        .delete()
        .eq("thread_id", threadId)
        .eq("role_id", roleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["thread-roles"] });
      toast({
        title: "Success",
        description: "Role removed from thread",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to remove role: " + error.message,
        variant: "destructive",
      });
    },
  });

  return {
    addRoleToThread,
    removeRoleFromThread,
  };
}