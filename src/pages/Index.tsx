import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const Index = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [roleToEdit, setRoleToEdit] = useState<any>(null);
  const [roleToDelete, setRoleToDelete] = useState<any>(null);
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
        const { data, error } = await supabase
          .from("roles")
          .insert({
            ...values,
            user_id: user.id,
          })
          .select()
          .single();

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
      setShowForm(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create role: " + error.message,
        variant: "destructive",
      });
    },
  });

  const updateRole = useMutation({
    mutationFn: async (values: RoleFormValues) => {
      if (!roleToEdit?.id) throw new Error("No role selected");

      const { data, error } = await supabase
        .from("roles")
        .update(values)
        .eq("id", roleToEdit.id)
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
      setRoleToEdit(null);
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
    mutationFn: async () => {
      if (!roleToDelete?.id) throw new Error("No role selected");

      const { error } = await supabase
        .from("roles")
        .delete()
        .eq("id", roleToDelete.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast({
        title: "Success",
        description: "Role deleted successfully",
      });
      setRoleToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete role: " + error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (values: RoleFormValues) => {
    if (roleToEdit) {
      updateRole.mutate(values);
    } else {
      createRole.mutate(values);
    }
  };

  return (
    <div className="min-h-screen flex flex-col w-full bg-gradient-to-br from-purple-50 to-white dark:from-gray-900 dark:to-gray-800">
      <AppNavbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="space-y-8">
          <div className="flex justify-between items-center">
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
            onEdit={setRoleToEdit}
            onDelete={setRoleToDelete}
          />
        </div>
      </main>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Role</DialogTitle>
          </DialogHeader>
          <RoleForm onSubmit={handleSubmit} isCreating={isCreating} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!roleToEdit} onOpenChange={() => setRoleToEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
          </DialogHeader>
          <RoleForm
            onSubmit={handleSubmit}
            isCreating={false}
            defaultValues={roleToEdit}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!roleToDelete} onOpenChange={() => setRoleToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the role
              and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteRole.mutate()}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Index;