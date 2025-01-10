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
  const [isProcessing, setIsProcessing] = useState(false);
  const queryClient = useQueryClient();

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
    if (!threadId || isProcessing) return;

    setIsProcessing(true);
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

        // Optimistically update the UI
        queryClient.setQueryData(["thread-roles", threadId], (old: any) => 
          old?.filter((id: string) => id !== roleId)
        );

        toast({
          title: "Role removed",
          description: "Role has been removed from the conversation.",
        });
      } else {
        onRoleSelected(roleId);
        // Optimistically update the UI
        queryClient.setQueryData(["thread-roles", threadId], (old: any) => 
          [...(old || []), roleId]
        );
        
        toast({
          title: "Role added",
          description: "Role has been added to the conversation.",
        });
      }
      
      await queryClient.invalidateQueries({ queryKey: ["thread-roles", threadId] });
    } catch (error) {
      console.error("Error toggling role:", error);
      toast({
        title: "Error",
        description: "Failed to update role in conversation.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          disabled={disabled}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Role
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
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
                  className="flex items-center justify-between p-3 rounded-md hover:bg-accent transition-colors"
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{role.name}</span>
                    <span className="text-xs text-muted-foreground">@{role.tag}</span>
                  </div>
                  <Button
                    variant={isAssigned ? "destructive" : "default"}
                    size="icon"
                    onClick={() => handleRoleToggle(role.id)}
                    disabled={isProcessing}
                    className="shrink-0"
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