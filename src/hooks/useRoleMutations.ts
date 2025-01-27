import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useRoleMutations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const addRoleToThread = useMutation({
    mutationFn: async ({ threadId, roleId }: { threadId: string; roleId: string }) => {
      // First check if role exists in thread
      const { data: existingRole } = await supabase
        .from("thread_roles")
        .select()
        .eq("thread_id", threadId)
        .eq("role_id", roleId)
        .single();

      if (existingRole) {
        throw new Error("Role already exists in thread");
      }

      const { error } = await supabase
        .from("thread_roles")
        .insert({
          thread_id: threadId,
          role_id: roleId,
        });

      if (error) throw error;

      // Initialize role interaction metrics with neutral scores
      await supabase
        .from("role_interactions")
        .insert({
          thread_id: threadId,
          initiator_role_id: roleId,
          responder_role_id: roleId,
          interaction_type: 'initialization',
          expertise_match_score: 0.5,
          context_match_score: 0.5,
          interaction_success: true
        });
    },
    onSuccess: (_, { threadId }) => {
      queryClient.invalidateQueries({ 
        queryKey: ["thread-roles", threadId]
      });
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
    onSuccess: (_, { threadId }) => {
      queryClient.invalidateQueries({ 
        queryKey: ["thread-roles", threadId]
      });
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