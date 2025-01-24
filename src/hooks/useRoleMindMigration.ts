import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { mindManager } from "@/utils/llongterm/MindManager";
import { useToast } from "@/hooks/use-toast";

export function useRoleMindMigration() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get roles that don't have minds yet
  const { data: unmappedRoles, isLoading } = useQuery({
    queryKey: ["unmapped-roles"],
    queryFn: async () => {
      const { data: roles, error } = await supabase
        .from("roles")
        .select("id, name, instructions, expertise_areas, special_capabilities")
        .not("id", "in", (
          supabase
            .from("role_minds")
            .select("role_id")
        ));

      if (error) throw error;
      return roles;
    },
  });

  // Create minds for roles that don't have them
  const createMindsMutation = useMutation({
    mutationFn: async () => {
      if (!unmappedRoles?.length) return;

      const results = await Promise.allSettled(
        unmappedRoles.map(async (role) => {
          try {
            const mindId = await mindManager.getMindForRole(role.id);
            console.log(`Created mind ${mindId} for role ${role.id}`);
            return { roleId: role.id, mindId, success: true };
          } catch (error) {
            console.error(`Failed to create mind for role ${role.id}:`, error);
            return { roleId: role.id, success: false, error };
          }
        })
      );

      return results;
    },
    onSuccess: (results) => {
      if (!results) return;

      const successful = results.filter(r => r.status === "fulfilled" && r.value.success).length;
      const failed = results.filter(r => r.status === "rejected" || !r.value.success).length;

      queryClient.invalidateQueries({ queryKey: ["unmapped-roles"] });
      queryClient.invalidateQueries({ queryKey: ["role-mind"] });

      toast({
        title: "Mind Creation Complete",
        description: `Successfully created ${successful} minds${failed > 0 ? `, ${failed} failed` : ''}`,
        variant: successful > 0 ? "default" : "destructive",
      });
    },
    onError: (error) => {
      console.error("Mind creation failed:", error);
      toast({
        title: "Error",
        description: "Failed to create minds for roles",
        variant: "destructive",
      });
    },
  });

  return {
    unmappedRoles,
    isLoading,
    createMinds: createMindsMutation.mutate,
    isCreating: createMindsMutation.isPending,
  };
}