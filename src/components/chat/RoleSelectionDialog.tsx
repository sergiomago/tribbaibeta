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

  const { data: allRoles } = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roles")
        .select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: threadRoles } = useQuery({
    queryKey: ["thread-roles", threadId],
    queryFn: async () => {
      if (!threadId) return [];
      const { data, error } = await supabase
        .from("thread_roles")
        .select("role_id")
        .eq("thread_id", threadId);
      if (error) throw error;
      return data.map(tr => tr.role_id);
    },
    enabled: !!threadId,
  });

  const handleRoleToggle = async (roleId: string) => {
    if (!threadId) return;

    try {
      const isRoleAssigned = threadRoles?.includes(roleId);

      if (isRoleAssigned) {
        // Remove role
        const { error } = await supabase
          .from("thread_roles")
          .delete()
          .eq("thread_id", threadId)
          .eq("role_id", roleId);

        if (error) throw error;

        toast({
          title: "Role removed",
          description: "Role has been removed from the conversation.",
        });
      } else {
        onRoleSelected(roleId);
        toast({
          title: "Role added",
          description: "Role has been added to the conversation.",
        });
      }
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
            {allRoles?.map((role) => {
              const isAssigned = threadRoles?.includes(role.id);
              return (
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
                    onClick={() => handleRoleToggle(role.id)}
                    className={isAssigned ? "text-destructive hover:text-destructive" : "text-primary hover:text-primary"}
                  >
                    {isAssigned ? (
                      <X className="h-4 w-4" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              );
            })}
            {allRoles?.length === 0 && (
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