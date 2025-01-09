import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { RoleForm, RoleFormValues } from "@/components/roles/RoleForm";
import { RoleList } from "@/components/roles/RoleList";

const Index = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const { user } = useAuth();

  const { data: roles, isLoading: isLoadingRoles } = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("roles").select("*");
      if (error) throw error;
      return data;
    },
  });

  const createRole = useMutation({
    mutationFn: async (values: RoleFormValues) => {
      if (!user) throw new Error("User not authenticated");
      
      setIsCreating(true);
      try {
        const { data: assistantData, error: assistantError } = await supabase.functions.invoke(
          "create-assistant",
          {
            body: JSON.stringify(values),
          }
        );

        if (assistantError) throw assistantError;

        const roleData = {
          name: values.name,
          alias: values.alias || null,
          tag: values.tag,
          description: values.description || null,
          instructions: values.instructions,
          model: values.model,
          user_id: user.id,
          assistant_id: assistantData.assistant_id,
        };

        const { data, error } = await supabase.from("roles").insert(roleData);

        if (error) throw error;
        return data;
      } finally {
        setIsCreating(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast({
        title: "Success",
        description: "Role created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create role: " + error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (values: RoleFormValues) => {
    createRole.mutate(values);
  };

  return (
    <div className="container mx-auto py-8">
      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Create New Role</h2>
          <RoleForm onSubmit={handleSubmit} isCreating={isCreating} />
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Your Roles</h2>
          <RoleList roles={roles} isLoading={isLoadingRoles} />
        </div>
      </div>
    </div>
  );
};

export default Index;