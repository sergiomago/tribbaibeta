import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { RoleTag } from "./RoleTag";
import { RoleSelectionDialog } from "./RoleSelectionDialog";
import { useRoleMutations } from "@/hooks/useRoleMutations";
import { useThreadMutations } from "@/hooks/useThreadMutations";

interface RoleManagementBarProps {
  threadId: string | null;
}

export function RoleManagementBar({ threadId }: RoleManagementBarProps) {
  const { updateThreadName } = useThreadMutations();
  const { addRoleToThread, removeRoleFromThread } = useRoleMutations();
  const [title, setTitle] = useState("");
  const queryClient = useQueryClient();

  const { data: thread } = useQuery({
    queryKey: ["thread", threadId],
    queryFn: async () => {
      if (!threadId) return null;
      const { data, error } = await supabase
        .from("threads")
        .select("name")
        .eq("id", threadId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!threadId,
  });

  const { data: threadRoles } = useQuery({
    queryKey: ["thread-roles", threadId],
    queryFn: async () => {
      if (!threadId) return [];
      const { data, error } = await supabase
        .from("thread_roles")
        .select(`
          role:roles (
            id,
            name,
            tag,
            description
          )
        `)
        .eq("thread_id", threadId);
      if (error) throw error;
      return data?.map(tr => tr.role) || [];
    },
    enabled: !!threadId,
  });

  useEffect(() => {
    if (thread?.name) {
      setTitle(thread.name);
    }
  }, [thread?.name]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  };

  const handleTitleUpdate = () => {
    if (threadId && title.trim() && title !== thread?.name) {
      updateThreadName.mutate({ threadId, name: title.trim() });
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleTitleUpdate();
    }
  };

  const handleRoleRemove = async (roleId: string) => {
    if (threadId) {
      await removeRoleFromThread.mutateAsync({ threadId, roleId });
      queryClient.invalidateQueries({ queryKey: ["thread-roles", threadId] });
      queryClient.invalidateQueries({ queryKey: ["available-roles", threadId] });
    }
  };

  return (
    <div className="border-b p-4 flex-shrink-0">
      <div className="flex items-center justify-between mb-2">
        <Input
          className="text-lg font-semibold bg-transparent border-none hover:bg-gray-100 dark:hover:bg-gray-800 px-2 max-w-[300px]"
          value={title}
          onChange={handleTitleChange}
          onBlur={handleTitleUpdate}
          onKeyDown={handleTitleKeyDown}
          placeholder="Chat title..."
        />
        <RoleSelectionDialog
          threadId={threadId}
          onRoleSelected={(roleId) => {
            if (threadId) {
              addRoleToThread.mutate({ threadId, roleId });
            }
          }}
          disabled={!threadId}
        />
      </div>
      <div className="flex gap-2 flex-wrap">
        {threadRoles?.map((role) => (
          <RoleTag
            key={role.id}
            role={role}
            onRemove={() => handleRoleRemove(role.id)}
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