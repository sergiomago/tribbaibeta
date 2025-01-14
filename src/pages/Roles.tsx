import { AppNavbar } from "@/components/AppNavbar";
import { RolePackages } from "@/components/roles/RolePackages";
import { RoleCountDisplay } from "@/components/roles/RoleCountDisplay";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tables } from "@/integrations/supabase/types";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useState } from "react";
import { RoleForm, RoleFormValues } from "@/components/roles/RoleForm";
import { useToast } from "@/hooks/use-toast";
import { useThreadMutations } from "@/hooks/useThreadMutations";
import { useRoleMutations } from "@/hooks/useRoleMutations";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { RoleManagement } from "@/components/roles/RoleManagement";
import { useNavigate } from "react-router-dom";

const Roles = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { planType } = useSubscription();
  const [editingRole, setEditingRole] = useState<Tables<"roles"> | null>(null);
  const { createThread } = useThreadMutations();
  const { addRoleToThread } = useRoleMutations();
  const queryClient = useQueryClient();

  const { data: roles, isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .eq('is_template', false)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Tables<"roles">[];
    }
  });

  const { data: roleCount } = useQuery({
    queryKey: ['role-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('roles')
        .select('*', { count: 'exact' })
        .eq('is_template', false);
      
      if (error) throw error;
      return count || 0;
    }
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('roles')
        .delete()
        .eq('id', id);
      
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
      console.error('Error deleting role:', error);
      toast({
        title: "Error",
        description: "Failed to delete role",
        variant: "destructive",
      });
    },
  });

  const handleDelete = async (id: string) => {
    try {
      await deleteRoleMutation.mutateAsync(id);
    } catch (error) {
      console.error('Error in handleDelete:', error);
    }
  };

  const handleStartChat = async (roleId: string) => {
    if (!user) return;

    try {
      const newThread = await createThread.mutateAsync(user.id);
      await addRoleToThread.mutateAsync({
        threadId: newThread.id,
        roleId: roleId,
      });

      navigate(`/chats?thread=${newThread.id}`);
    } catch (error) {
      console.error('Error starting chat:', error);
      toast({
        title: "Error",
        description: "Failed to start chat",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (id: string) => {
    const role = roles?.find(r => r.id === id);
    if (role) {
      setEditingRole(role);
    }
  };

  const handleUpdateRole = async (values: RoleFormValues) => {
    try {
      const { error } = await supabase
        .from('roles')
        .update({
          name: values.name,
          alias: values.alias,
          tag: values.tag,
          description: values.description,
          instructions: values.instructions,
          model: values.model,
        })
        .eq('id', values.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast({
        title: "Success",
        description: "Role updated successfully",
      });
      setEditingRole(null);
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: "Error",
        description: "Failed to update role",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col w-full bg-gradient-to-br from-purple-50 to-white dark:from-gray-900 dark:to-gray-800">
      <AppNavbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Roles</h1>
        </div>

        <RoleCountDisplay />
        <RolePackages />
        
        <RoleManagement 
          roles={roles}
          isLoading={isLoading}
          onDelete={handleDelete}
          onStartChat={handleStartChat}
          onEdit={handleEdit}
          roleCount={roleCount}
          planType={planType}
        />
      </main>

      <Dialog open={!!editingRole} onOpenChange={(open) => !open && setEditingRole(null)}>
        <DialogContent className="sm:max-w-[600px]">
          {editingRole && (
            <RoleForm
              onSubmit={handleUpdateRole}
              isCreating={false}
              defaultValues={{
                id: editingRole.id,
                name: editingRole.name,
                alias: editingRole.alias || undefined,
                tag: editingRole.tag,
                description: editingRole.description || "",
                instructions: editingRole.instructions,
                model: editingRole.model === "gpt-4o" || editingRole.model === "gpt-4o-mini" 
                  ? editingRole.model 
                  : "gpt-4o"
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Roles;