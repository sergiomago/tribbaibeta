import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useRoleMutations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const addRoleToThread = useMutation({
    mutationFn: async ({ threadId, roleId }: { threadId: string; roleId: string }) => {
      if (!threadId || !roleId) {
        throw new Error("Thread ID and Role ID are required");
      }

      // First check if the role is already in the thread
      const { data: existingRole } = await supabase
        .from("thread_roles")
        .select()
        .eq("thread_id", threadId)
        .eq("role_id", roleId)
        .maybeSingle();

      if (existingRole) {
        throw new Error("This role is already in the thread");
      }

      // If not, add the role
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
        description: error instanceof Error ? error.message : "Failed to add role",
        variant: "destructive",
      });
    },
  });

  const removeRoleFromThread = useMutation({
    mutationFn: async ({ threadId, roleId }: { threadId: string; roleId: string }) => {
      if (!threadId || !roleId) {
        throw new Error("Thread ID and Role ID are required");
      }

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