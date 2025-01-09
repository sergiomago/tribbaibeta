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

  const { data: availableRoles } = useQuery({
    queryKey: ["available-roles", threadId],
    queryFn: async () => {
      if (!threadId) return [];
      
      // Get all roles that aren't already assigned to this thread
      const { data, error } = await supabase
        .from("roles")
        .select("*")
        .not("id", "in", (
          supabase
            .from("thread_roles")
            .select("role_id")
            .eq("thread_id", threadId)
        ));

      if (error) throw error;
      return data;
    },
    enabled: !!threadId,
  });

  const handleRoleSelect = (roleId: string) => {
    onRoleSelected(roleId);
    setOpen(false);
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