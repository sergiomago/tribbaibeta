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
      setEditingRole({
        name: role.name,
        alias: role.alias || "",
        tag: role.tag,
        description: role.description || "",
        instructions: role.instructions,
        model: role.model,
        id: role.id,
      });
    }
  };

  const handleSubmit = (values: RoleFormValues) => {
    if (editingRole) {
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
          onEdit={handleEdit}
        />

        <Dialog 
          open={showForm || editingRole !== null} 
          onOpenChange={(open) => {
            setShowForm(open);
            if (!open) setEditingRole(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
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