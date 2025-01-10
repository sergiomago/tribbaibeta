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
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useRoleMutations } from "@/hooks/useRoleMutations";

interface RoleSelectionDialogProps {
  threadId: string | null;
  onRoleSelected: (roleId: string) => void;
  disabled?: boolean;
}

export function RoleSelectionDialog({ 
  threadId, 
  onRoleSelected,
  disabled 
}: RoleSelectionDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { addRoleToThread, removeRoleFromThread } = useRoleMutations();

  const { data: availableRoles } = useQuery({
    queryKey: ["available-roles", threadId],
    queryFn: async () => {
      if (!threadId) return [];
      
      const { data: roles } = await supabase
        .from("roles")
        .select("*");

      const { data: assignedRoles } = await supabase
        .from("thread_roles")
        .select("role_id")
        .eq("thread_id", threadId);

      const assignedRoleIds = new Set(assignedRoles?.map(tr => tr.role_id) || []);

      return roles?.map(role => ({
        ...role,
        isAssigned: assignedRoleIds.has(role.id)
      })) || [];
    },
    enabled: !!threadId,
  });

  const handleRoleToggle = async (roleId: string, isAssigned: boolean) => {
    if (!threadId || !roleId) return;

    try {
      if (isAssigned) {
        await removeRoleFromThread.mutateAsync({ threadId, roleId });
        toast({
          title: "Role removed",
          description: "Role has been removed from the conversation.",
        });
      } else {
        await addRoleToThread.mutateAsync({ threadId, roleId });
        toast({
          title: "Role added",
          description: "Role has been added to the conversation.",
        });
      }
      
      // Invalidate both queries to ensure UI updates
      await queryClient.invalidateQueries({ queryKey: ["thread-roles", threadId] });
      await queryClient.invalidateQueries({ queryKey: ["available-roles", threadId] });
    } catch (error) {
      console.error("Error toggling role:", error);
      toast({
        title: "Error",
        description: "Failed to update role in conversation.",
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
          Add Role
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Select Roles</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[300px] mt-4">
          <div className="space-y-2">
            {availableRoles?.map((role) => (
              <div
                key={role.id}
                className="flex items-center justify-between p-2 rounded-md hover:bg-accent"
              >
                <div className="flex flex-col">
                  <span className="font-medium">{role.name}</span>
                  <span className="text-xs text-muted-foreground">@{role.tag}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => role.id && handleRoleToggle(role.id, role.isAssigned)}
                  className={role.isAssigned ? "text-destructive hover:text-destructive" : "text-primary hover:text-primary"}
                >
                  {role.isAssigned ? (
                    <X className="h-4 w-4" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </Button>
              </div>
            ))}
            {availableRoles?.length === 0 && (
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