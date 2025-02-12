import { useState } from "react";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface RoleManagementBarProps {
  threadId: string | null;
}

export function RoleManagementBar({ threadId }: RoleManagementBarProps) {
  const [title, setTitle] = useState("Project Discussion");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: threadRoles } = useQuery({
    queryKey: ["thread-roles", threadId],
    queryFn: async () => {
      if (!threadId) return [];
      const { data, error } = await supabase
        .from("thread_roles")
        .select(`
          role:roles (*)
        `)
        .eq("thread_id", threadId);
      if (error) throw error;
      return data.map((tr) => tr.role);
    },
    enabled: !!threadId,
  });

  const addRoleToThread = useMutation({
    mutationFn: async (roleId: string) => {
      if (!threadId) {
        throw new Error("No thread selected");
      }

      const { error } = await supabase
        .from("thread_roles")
        .insert({
          thread_id: threadId,
          role_id: roleId,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["thread-roles", threadId] });
      queryClient.invalidateQueries({ queryKey: ["available-roles", threadId] });
      toast({
        title: "Success",
        description: "Role added to thread",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add role: " + error.message,
        variant: "destructive",
      });
    },
  });

  const removeRoleFromThread = useMutation({
    mutationFn: async (roleId: string) => {
      if (!threadId) {
        throw new Error("No thread selected");
      }
      const { error } = await supabase
        .from("thread_roles")
        .delete()
        .eq("thread_id", threadId)
        .eq("role_id", roleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["thread-roles", threadId] });
      queryClient.invalidateQueries({ queryKey: ["available-roles", threadId] });
      toast({
        title: "Success",
        description: "Role removed from thread",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to remove role: " + error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="border-b p-4 flex-shrink-0">
      <div className="flex items-center justify-between mb-2">
        <Input
          className="text-lg font-semibold bg-transparent border-none hover:bg-gray-100 dark:hover:bg-gray-800 px-2 max-w-[300px]"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Chat title..."
        />
        <RoleSelectionDialog
          threadId={threadId}
          onRoleSelected={(roleId) => addRoleToThread.mutate(roleId)}
          disabled={!threadId}
        />
      </div>
      <div className="flex gap-2 flex-wrap">
        {threadRoles?.map((role) => (
          <RoleTag
            key={role.id}
            role={role}
            onRemove={() => removeRoleFromThread.mutate(role.id)}
          />
        ))}
        {threadRoles?.length === 0 && (
          <div className="text-sm text-muted-foreground">
            No roles assigned. Add roles to start chatting.
          </div>
        )}
      </div>
    </div>
  );
}

import { RoleSelectionDialog } from "@/components/roles/RoleSelectionDialog";
import { RoleTag } from "@/components/roles/RoleTag";