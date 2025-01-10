import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useRoleMutations() {
  const queryClient = useQueryClient();

  const addRoleToThread = useMutation({
    mutationFn: async ({ threadId, roleId }: { threadId: string; roleId: string }) => {
      if (!threadId || !roleId) {
        throw new Error("Thread ID and Role ID are required");
      }

      // Check if role already exists in thread
      const { data: existingRole } = await supabase
        .from("thread_roles")
        .select()
        .eq("thread_id", threadId)
        .eq("role_id", roleId)
        .maybeSingle();

      if (existingRole) {
        throw new Error("This role is already in the thread");
      }

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
      toast.success("Role added to thread");
    },
    onError: (error: Error) => {
      toast.error(error.message);
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
      toast.success("Role removed from thread");
    },
    onError: (error: Error) => {
      toast.error("Failed to remove role: " + error.message);
    },
  });

  return {
    addRoleToThread,
    removeRoleFromThread,
  };
}