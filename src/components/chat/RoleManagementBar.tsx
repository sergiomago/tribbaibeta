import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";
import { RoleSelectionDialog } from "./RoleSelectionDialog";

interface RoleTagProps {
  role: Tables<"roles">;
  onRemove: (roleId: string) => void;
}

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
      return data.map(tr => tr.role);
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

  const hasRoles = threadRoles && threadRoles.length > 0;

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
      <div className="flex gap-2 flex-wrap min-h-[32px]">
        {threadRoles?.map((role) => (
          <RoleTag
            key={role.id}
            role={role}
            onRemove={() => removeRoleFromThread.mutate(role.id)}
          />
        ))}
      </div>
    </div>
  );
}

function RoleTag({ role, onRemove }: RoleTagProps) {
  return (
    <div className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm">
      <span className="font-medium text-primary">{role.name}</span>
      <span className="text-xs text-gray-500">{role.tag}</span>
      <button
        className="ml-1 rounded-full hover:bg-primary/20 p-1"
        onClick={() => onRemove(role.id)}
      >
        <X className="h-3 w-3 text-primary" />
      </button>
    </div>
  );
}
