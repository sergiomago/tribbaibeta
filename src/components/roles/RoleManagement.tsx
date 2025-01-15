import { useState } from "react";
import { RoleList } from "./RoleList";
import { RoleCountDisplay } from "./RoleCountDisplay";
import { CreateRoleButton } from "./CreateRoleButton";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Role } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { RolePackages } from "./RolePackages";
import { TestSubscriptionToggle } from "./TestSubscriptionToggle";

export function RoleManagement() {
  const [isGridView, setIsGridView] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { planType } = useSubscription();
  const queryClient = useQueryClient();

  const { data: roles } = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roles")
        .select("*")
        .eq("is_template", false)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Role[];
    },
  });

  const handleDelete = async (roleId: string) => {
    try {
      const { error } = await supabase
        .from("roles")
        .delete()
        .eq("id", roleId);

      if (error) throw error;

      // Invalidate and refetch roles after successful deletion
      queryClient.invalidateQueries({ queryKey: ["roles"] });

      toast({
        title: "Success",
        description: "Role deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting role:", error);
      toast({
        title: "Error",
        description: "Failed to delete role",
        variant: "destructive",
      });
    }
  };

  const handleStartChat = (roleId: string) => {
    navigate(`/chats?role=${roleId}`);
  };

  const handleEdit = (roleId: string) => {
    navigate(`/roles/${roleId}/edit`);
  };

  return (
    <div className="space-y-8">
      <TestSubscriptionToggle />
      
      <div className="flex justify-between items-center">
        <RoleCountDisplay />
        <CreateRoleButton 
          planType={planType || null}
          roleCount={roles?.length}
        />
      </div>

      <RolePackages />

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Your Roles</h2>
        <RoleList
          roles={roles || []}
          isGridView={isGridView}
          onDelete={handleDelete}
          onStartChat={handleStartChat}
          onEdit={handleEdit}
        />
      </div>
    </div>
  );
}