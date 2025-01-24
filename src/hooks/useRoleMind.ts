import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { mindManager } from "@/utils/llongterm/MindManager";

export function useRoleMind(roleId: string | null) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: mindData, isLoading: isMindLoading } = useQuery({
    queryKey: ["role-mind", roleId],
    queryFn: async () => {
      if (!roleId) return null;
      
      const { data: mindInfo, error } = await supabase
        .from("role_minds")
        .select("*")
        .eq("role_id", roleId)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return mindInfo;
    },
    enabled: !!roleId,
  });

  const createMind = useMutation({
    mutationFn: async () => {
      if (!roleId) throw new Error("No role ID provided");

      // Get role details
      const { data: role, error: roleError } = await supabase
        .from("roles")
        .select("*")
        .eq("id", roleId)
        .single();

      if (roleError) throw roleError;

      // Create mind using the mindManager
      const mindId = await mindManager.getMindForRole(roleId);

      // Store mind association
      const { error: mindError } = await supabase
        .from("role_minds")
        .insert({
          role_id: roleId,
          mind_id: mindId,
          status: "active",
          metadata: {
            name: role.name,
            expertise: role.expertise_areas,
            capabilities: role.special_capabilities
          }
        });

      if (mindError) throw mindError;
      return mindId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["role-mind", roleId] });
      toast({
        title: "Mind Created",
        description: "Successfully created and connected mind to role",
      });
    },
    onError: (error) => {
      console.error("Error creating mind:", error);
      toast({
        title: "Error",
        description: "Failed to create mind for role",
        variant: "destructive",
      });
    },
  });

  const updateMindStatus = useMutation({
    mutationFn: async (status: "active" | "inactive" | "error") => {
      if (!roleId) throw new Error("No role ID provided");
      await mindManager.updateMindStatus(roleId, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["role-mind", roleId] });
    },
  });

  return {
    mind: mindData,
    isMindLoading,
    createMind,
    updateMindStatus,
  };
}