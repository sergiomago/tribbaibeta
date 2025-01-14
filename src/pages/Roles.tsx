import { AppNavbar } from "@/components/AppNavbar";
import { RoleList } from "@/components/roles/RoleList";
import { RolePackages } from "@/components/roles/RolePackages";
import { RoleCountDisplay } from "@/components/roles/RoleCountDisplay";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Tables } from "@/integrations/supabase/types";
import { Plus, Grid, List, ArrowDown, ArrowUp, Calendar } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useState } from "react";
import { RoleForm, RoleFormValues } from "@/components/roles/RoleForm";
import { useToast } from "@/hooks/use-toast";
import { useThreadMutations } from "@/hooks/useThreadMutations";
import { useRoleMutations } from "@/hooks/useRoleMutations";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ViewMode = 'grid' | 'list';
type SortOption = 'role-asc' | 'role-desc' | 'date-new' | 'date-old';

const Roles = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { planType } = useSubscription();
  const [editingRole, setEditingRole] = useState<Tables<"roles"> | null>(null);
  const { createThread } = useThreadMutations();
  const { addRoleToThread } = useRoleMutations();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortOption, setSortOption] = useState<SortOption>('role-asc');

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

  const sortRoles = (rolesData: Tables<"roles">[]) => {
    if (!rolesData) return [];
    
    const sorted = [...rolesData];
    switch (sortOption) {
      case 'role-asc':
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case 'role-desc':
        return sorted.sort((a, b) => b.name.localeCompare(a.name));
      case 'date-new':
        return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      case 'date-old':
        return sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      default:
        return sorted;
    }
  };

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

  const handleCreateRole = () => {
    const maxRoles = planType === 'creator' ? 7 : 3;
    const isAtLimit = roleCount && roleCount >= maxRoles;

    if (isAtLimit) {
      const message = planType === 'creator' 
        ? "You've reached the limit of 7 roles on the Creator plan. Upgrade to Maestro for unlimited roles."
        : "You've reached the free tier limit of 3 roles. Upgrade to Creator for up to 7 roles, or Maestro for unlimited roles.";
      
      toast({
        title: "Role limit reached",
        description: message,
        variant: "destructive",
      });
      return;
    }
    navigate('/roles/create');
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

  const isCreateDisabled = roleCount !== undefined && (
    (planType === 'creator' && roleCount >= 7) ||
    (!planType && roleCount >= 3)
  );

  return (
    <div className="min-h-screen flex flex-col w-full bg-gradient-to-br from-purple-50 to-white dark:from-gray-900 dark:to-gray-800">
      <AppNavbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Roles</h1>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  {sortOption === 'role-asc' && <ArrowUp className="mr-2" />}
                  {sortOption === 'role-desc' && <ArrowDown className="mr-2" />}
                  {sortOption === 'date-new' && <Calendar className="mr-2" />}
                  {sortOption === 'date-old' && <Calendar className="mr-2" />}
                  Sort by
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSortOption('role-asc')}>
                  Role (A-Z)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortOption('role-desc')}>
                  Role (Z-A)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortOption('date-new')}>
                  Newest First
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortOption('date-old')}>
                  Oldest First
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button 
              variant="outline"
              size="sm"
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            >
              {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
            </Button>
            <Button 
              onClick={handleCreateRole}
              className="gap-2"
              disabled={isCreateDisabled}
            >
              <Plus className="h-4 w-4" />
              Create Role
            </Button>
          </div>
        </div>

        <RoleCountDisplay />
        
        <RolePackages />
        
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-6">Your Roles</h2>
          <RoleList 
            roles={sortRoles(roles)}
            isLoading={isLoading}
            onDelete={handleDelete}
            onStartChat={handleStartChat}
            onEdit={handleEdit}
            viewMode={viewMode}
          />
        </div>
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