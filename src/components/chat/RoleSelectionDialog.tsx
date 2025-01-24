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

  // Fetch all roles for the user
  const { data: userRoles = [] } = useQuery({
    queryKey: ["user-roles", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data: roles, error } = await supabase
        .from("roles")
        .select("id, name, instructions, expertise_areas, special_capabilities")
        .eq("user_id", user.id);

      if (error) {
        console.error("Error fetching roles:", error);
        throw error;
      }
      return roles || [];
    },
    enabled: !!user,
  });

  // Fetch thread roles separately
  const { data: threadRoles = [] } = useQuery({
    queryKey: ["thread-roles", threadId],
    queryFn: async () => {
      if (!threadId) return [];
      
      const { data, error } = await supabase
        .from("thread_roles")
        .select("role_id")
        .eq("thread_id", threadId);

      if (error) {
        console.error("Error fetching thread roles:", error);
        throw error;
      }
      return data || [];
    },
    enabled: !!threadId,
  });

  // Create a Set of assigned role IDs for efficient lookup
  const assignedRoleIds = new Set(threadRoles.map(tr => tr.role_id));

  const handleRoleClick = async (roleId: string, isAssigned: boolean) => {
    if (!threadId) return;

    try {
      if (isAssigned) {
        await onRoleRemoved(roleId);
      } else {
        await onRoleSelected(roleId);
      }
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
            {userRoles.map((role) => (
              <Button
                key={role.id}
                variant={assignedRoleIds.has(role.id) ? "secondary" : "outline"}
                className="w-full justify-between"
                onClick={() => handleRoleClick(role.id, assignedRoleIds.has(role.id))}
              >
                <div className="flex flex-col items-start">
                  <span className="font-medium">{role.name}</span>
                  {role.expertise_areas && role.expertise_areas.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {role.expertise_areas.join(", ")}
                    </span>
                  )}
                </div>
                {assignedRoleIds.has(role.id) ? (
                  <X className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Plus className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            ))}
            {userRoles.length === 0 && (
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