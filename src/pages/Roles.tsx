import { AppNavbar } from "@/components/AppNavbar";
import { RoleList } from "@/components/roles/RoleList";
import { RolePackages } from "@/components/roles/RolePackages";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Tables } from "@/integrations/supabase/types";
import { Plus } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useState } from "react";
import { RoleForm, RoleFormValues } from "@/components/roles/RoleForm";
import { useToast } from "@/hooks/use-toast";
import { useThreadMutations } from "@/hooks/useThreadMutations";
import { useRoleMutations } from "@/hooks/useRoleMutations";
import { useAuth } from "@/contexts/AuthContext";

const Roles = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [editingRole, setEditingRole] = useState<Tables<"roles"> | null>(null);
  const { createThread } = useThreadMutations();
  const { addRoleToThread } = useRoleMutations();

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

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('roles')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('Error deleting role:', error);
      toast({
        title: "Error",
        description: "Failed to delete role",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Role deleted successfully",
      });
    }
  };

  const handleStartChat = async (roleId: string) => {
    if (!user) return;

    try {
      // Create a new thread
      const newThread = await createThread.mutateAsync(user.id);
      
      // Add the role to the thread
      await addRoleToThread.mutateAsync({
        threadId: newThread.id,
        roleId: roleId,
      });

      // Navigate to the chat with the new thread
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

  const convertToFormValues = (role: Tables<"roles">): RoleFormValues => {
    return {
      id: role.id,
      name: role.name,
      alias: role.alias || undefined,
      tag: role.tag,
      description: role.description || "",
      instructions: role.instructions,
      model: (role.model === "gpt-4o" || role.model === "gpt-4o-mini") 
        ? role.model 
        : "gpt-4o" // fallback to default if invalid
    };
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
          <Button 
            onClick={() => navigate('/roles/create')}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Role
          </Button>
        </div>

        <RolePackages />
        
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-6">Your Roles</h2>
          <RoleList 
            roles={roles}
            isLoading={isLoading}
            onDelete={handleDelete}
            onStartChat={handleStartChat}
            onEdit={handleEdit}
          />
        </div>
      </main>

      <Dialog open={!!editingRole} onOpenChange={(open) => !open && setEditingRole(null)}>
        <DialogContent className="sm:max-w-[600px]">
          {editingRole && (
            <RoleForm
              onSubmit={handleUpdateRole}
              isCreating={false}
              defaultValues={convertToFormValues(editingRole)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Roles;