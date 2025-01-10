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
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const Roles = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleFormValues | null>(null);
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

  const updateRole = useMutation({
    mutationFn: async (values: RoleFormValues & { id: string }) => {
      const { id, ...updateData } = values;
      const { data, error } = await supabase
        .from("roles")
        .update({
          name: updateData.name,
          alias: updateData.alias || null,
          tag: updateData.tag,
          description: updateData.description || null,
          instructions: updateData.instructions,
          model: updateData.model,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast({
        title: "Success",
        description: "Role updated successfully",
      });
      setEditingRole(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update role: " + error.message,
        variant: "destructive",
      });
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

  const handleEdit = (roleId: string) => {
    const role = roles?.find(r => r.id === roleId);
    if (role) {
      // Ensure model is of the correct type
      const model = role.model === "gpt-4o" || role.model === "gpt-4o-mini" 
        ? role.model 
        : "gpt-4o-mini";

      setEditingRole({
        id: role.id,
        name: role.name,
        alias: role.alias || "",
        tag: role.tag,
        description: role.description || "",
        instructions: role.instructions,
        model: model,
      });
    }
  };

  const handleSubmit = (values: RoleFormValues) => {
    if (editingRole?.id) {
      updateRole.mutate({ ...values, id: editingRole.id });
    } else {
      createRole.mutate(values);
    }
  };

  return (
    <div className="min-h-screen flex flex-col w-full bg-gradient-to-br from-purple-50 to-white dark:from-gray-900 dark:to-gray-800">
      <AppNavbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-primary">
            Roles
          </h1>
          <Button
            onClick={() => setShowForm(true)}
            className="bg-gradient-primary text-white hover:opacity-90 transition-all duration-300"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Role
          </Button>
        </div>

        <RoleList 
          roles={roles} 
          isLoading={isLoadingRoles}
          onDelete={(id) => deleteRole.mutate(id)}
          onStartChat={handleStartChat}
          onEdit={handleEdit}
        />

        <Dialog 
          open={showForm || editingRole !== null} 
          onOpenChange={(open) => {
            setShowForm(open);
            if (!open) setEditingRole(null);
          }}
        >
          <DialogContent className="sm:max-w-[600px] bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg border-gray-200 dark:border-gray-800">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-primary">
                {editingRole ? "Edit Role" : "Create New Role"}
              </DialogTitle>
            </DialogHeader>
            <RoleForm 
              onSubmit={handleSubmit} 
              isCreating={isCreating}
              defaultValues={editingRole || undefined}
            />
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default Roles;