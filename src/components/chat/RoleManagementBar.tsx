import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { RoleTag } from "./RoleTag";
import { RoleSelectionDialog } from "./RoleSelectionDialog";
import { useRoleMutations } from "@/hooks/useRoleMutations";
import { useThreadMutations } from "@/hooks/useThreadMutations";
import { useIsMobile } from "@/hooks/use-mobile";
import { Badge } from "@/components/ui/badge";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface RoleManagementBarProps {
  threadId: string | null;
}

export function RoleManagementBar({ threadId }: RoleManagementBarProps) {
  const { updateThreadName } = useThreadMutations();
  const { addRoleToThread, removeRoleFromThread } = useRoleMutations();
  const [title, setTitle] = useState("");
  const isMobile = useIsMobile();

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
          role:roles (*)
        `)
        .eq("thread_id", threadId)
        .orderBy("created_at", { ascending: true });
      if (error) throw error;
      return data.map(tr => tr.role);
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

  return (
    <div className="border-b p-2 sm:p-4 flex-shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-between mb-2 gap-2">
        <Input
          className="text-base sm:text-lg font-semibold bg-transparent border-none hover:bg-gray-100 dark:hover:bg-gray-800 px-2 min-w-0 flex-1"
          value={title}
          onChange={handleTitleChange}
          onBlur={handleTitleUpdate}
          onKeyDown={handleTitleKeyDown}
          placeholder="Chat title..."
        />
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger>
              <Badge variant="outline" className="hidden sm:flex">
                <Info className="h-3 w-3 mr-1" />
                {threadRoles?.length || 0} roles
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">Number of roles in this conversation</p>
            </TooltipContent>
          </Tooltip>
          <RoleSelectionDialog
            threadId={threadId}
            onRoleSelected={(roleId) => {
              if (threadId) {
                addRoleToThread.mutate({ threadId, roleId });
              }
            }}
            onRoleRemoved={(roleId) => {
              if (threadId) {
                removeRoleFromThread.mutate({ threadId, roleId });
              }
            }}
            disabled={!threadId}
          />
        </div>
      </div>
      <div className={`flex gap-1.5 sm:gap-2 flex-wrap ${isMobile ? 'max-h-24 overflow-y-auto' : ''}`}>
        {threadRoles?.map((role) => (
          <RoleTag
            key={role.id}
            role={role}
            onRemove={() => {
              if (threadId) {
                removeRoleFromThread.mutate({ threadId, roleId: role.id });
              }
            }}
            className="text-xs sm:text-sm"
          />
        ))}
        {threadRoles?.length === 0 && (
          <div className="text-xs sm:text-sm text-muted-foreground">
            No roles assigned. Add roles to start chatting.
          </div>
        )}
      </div>
    </div>
  );
}