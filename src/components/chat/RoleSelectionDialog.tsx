import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface RoleSelectionDialogProps {
  threadId: string | null;
  onRoleSelected: (roleId: string) => void;
  onRoleRemoved: (roleId: string) => void;
  disabled?: boolean;
}

export function RoleSelectionDialog({ 
  threadId, 
  onRoleSelected,
  onRoleRemoved,
  disabled 
}: RoleSelectionDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: roles, refetch } = useQuery({
    queryKey: ["roles-with-assignment", threadId],
    queryFn: async () => {
      if (!threadId || !user) return [];
      
      // Modified query to correctly filter user's roles and template roles
      const { data: allRoles, error: rolesError } = await supabase
        .from("roles")
        .select("*")
        .or(`user_id.eq.${user.id},is_template.eq.true`);

      if (rolesError) throw rolesError;

      const { data: threadRoles, error: threadRolesError } = await supabase
        .from("thread_roles")
        .select("role_id")
        .eq("thread_id", threadId);

      if (threadRolesError) throw threadRolesError;

      const assignedRoleIds = new Set(threadRoles?.map(tr => tr.role_id) || []);

      return allRoles.map(role => ({
        ...role,
        isAssigned: assignedRoleIds.has(role.id)
      }));
    },
    enabled: !!threadId && !!user,
  });

  const handleRoleClick = async (roleId: string, isAssigned: boolean) => {
    if (!threadId) return;

    try {
      if (isAssigned) {
        await onRoleRemoved(roleId);
      } else {
        await onRoleSelected(roleId);
      }
      refetch();
    } catch (error) {
      console.error("Error managing role:", error);
      toast({
        title: "Error",
        description: `Failed to ${isAssigned ? 'remove' : 'add'} role.`,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          disabled={disabled}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Roles
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Roles</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[300px] mt-4">
          <div className="space-y-2">
            {roles?.map((role) => (
              <Button
                key={role.id}
                variant={role.isAssigned ? "secondary" : "outline"}
                className="w-full justify-between"
                onClick={() => handleRoleClick(role.id, role.isAssigned)}
              >
                <div className="flex flex-col items-start">
                  <span className="font-medium">{role.name}</span>
                  <span className="text-xs text-muted-foreground">{role.tag}</span>
                </div>
                {role.isAssigned ? (
                  <X className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Plus className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            ))}
            {roles?.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No roles available
              </p>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}