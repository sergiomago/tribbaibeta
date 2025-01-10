import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { RoleForm, RoleFormValues } from "@/components/roles/RoleForm";
import { RoleList } from "@/components/roles/RoleList";
import { AppNavbar } from "@/components/AppNavbar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const Roles = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const { user } = useAuth();

  const { data: roles, isLoading: isLoadingRoles } = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createRole = useMutation({
    mutationFn: async (values: RoleFormValues) => {
      if (!user) throw new Error("User not authenticated");
      
      setIsCreating(true);
      const { data, error } = await supabase
        .from("roles")
        .insert({
          name: values.name,
          alias: values.alias || null,
          tag: values.tag,
          description: values.description || null,
          instructions: values.instructions,
          model: values.model,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast({
        title: "Success",
        description: "Role created successfully",
      });
      setShowForm(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create role: " + error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsCreating(false);
    },
  });

  const deleteRole = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase
        .from("roles")
        .delete()
        .eq("id", roleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast({
        title: "Success",
        description: "Role deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete role: " + error.message,
        variant: "destructive",
      });
    },
  });

  const handleStartChat = (roleId: string) => {
    navigate(`/chats?role=${roleId}`);
  };

  const handleSubmit = (values: RoleFormValues) => {
    createRole.mutate(values);
  };

  return (
    <div className="min-h-screen flex flex-col w-full bg-gradient-to-br from-purple-50 to-white dark:from-gray-900 dark:to-gray-800">
      <AppNavbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Roles</h1>
          <button
            onClick={() => setShowForm(true)}
            className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90"
          >
            Create Role
          </button>
        </div>

        <RoleList 
          roles={roles} 
          isLoading={isLoadingRoles}
          onDelete={(id) => deleteRole.mutate(id)}
          onStartChat={handleStartChat}
        />

        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Role</DialogTitle>
            </DialogHeader>
            <RoleForm onSubmit={handleSubmit} isCreating={isCreating} />
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default Roles;