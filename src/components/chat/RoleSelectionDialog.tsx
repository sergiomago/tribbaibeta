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
import { Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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

  const { data: availableRoles } = useQuery({
    queryKey: ["available-roles", threadId],
    queryFn: async () => {
      if (!threadId) return [];
      
      // First get the IDs of roles already assigned to this thread
      const { data: assignedRoles } = await supabase
        .from("thread_roles")
        .select("role_id")
        .eq("thread_id", threadId);

      const assignedRoleIds = assignedRoles?.map(tr => tr.role_id) || [];

      // If there are no assigned roles, just return all roles
      if (assignedRoleIds.length === 0) {
        const { data, error } = await supabase
          .from("roles")
          .select("*");
        if (error) throw error;
        return data;
      }

      // Otherwise, get all roles that aren't in the assigned list
      const { data, error } = await supabase
        .from("roles")
        .select("*")
        .not("id", "in", `(${assignedRoleIds.join(",")})`);

      if (error) throw error;
      return data;
    },
    enabled: !!threadId,
  });

  const handleRoleSelect = async (roleId: string) => {
    if (!threadId) return;

    try {
      // First check if the role is already assigned
      const { data: existingRole, error } = await supabase
        .from("thread_roles")
        .select("*")
        .eq("thread_id", threadId)
        .eq("role_id", roleId)
        .maybeSingle();

      if (error) {
        console.error("Error checking role assignment:", error);
        toast({
          title: "Error",
          description: "Failed to check role assignment.",
          variant: "destructive",
        });
        return;
      }

      if (existingRole) {
        toast({
          title: "Role already assigned",
          description: "This role is already part of the conversation.",
          variant: "destructive",
        });
        return;
      }

      onRoleSelected(roleId);
      setOpen(false);
    } catch (error) {
      console.error("Error checking role assignment:", error);
      toast({
        title: "Error",
        description: "Failed to add role to conversation.",
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
          <DialogTitle>Select a Role</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[300px] mt-4">
          <div className="space-y-2">
            {availableRoles?.map((role) => (
              <Button
                key={role.id}
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleRoleSelect(role.id)}
              >
                <div className="flex flex-col items-start">
                  <span className="font-medium">{role.name}</span>
                  <span className="text-xs text-muted-foreground">@{role.tag}</span>
                </div>
              </Button>
            ))}
            {availableRoles?.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No available roles to add
              </p>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}