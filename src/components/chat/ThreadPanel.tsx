import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ThreadListItem } from "./ThreadListItem";
import { DeleteThreadDialog } from "./DeleteThreadDialog";
import { useThreadMutations } from "@/hooks/useThreadMutations";

interface ThreadPanelProps {
  selectedThreadId: string | null;
  onThreadSelect: (threadId: string) => void;
}

export function ThreadPanel({ selectedThreadId, onThreadSelect }: ThreadPanelProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [newThreadName, setNewThreadName] = useState("");
  const [threadToDelete, setThreadToDelete] = useState<string | null>(null);
  const { createThread, updateThreadName, deleteThread } = useThreadMutations();

  const { data: threads } = useQuery({
    queryKey: ["threads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("threads")
        .select("*")
        .order("last_opened", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handleEditStart = (thread: any) => {
    setEditingThreadId(thread.id);
    setNewThreadName(thread.name);
  };

  const handleEditSubmit = (threadId: string) => {
    if (newThreadName.trim()) {
      updateThreadName.mutate({ threadId, name: newThreadName.trim() });
      setEditingThreadId(null);
    }
  };

  const handleCreateThread = () => {
    if (!user) return;
    createThread.mutate(user.id, {
      onSuccess: (newThread) => {
        onThreadSelect(newThread.id);
      },
    });
  };

  useEffect(() => {
    const channel = supabase
      .channel('thread-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'threads',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["threads"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return (
    <div className="h-full flex flex-col border-r">
      <div className="p-4 border-b">
        <Button
          className="w-full"
          onClick={handleCreateThread}
          disabled={createThread.isPending}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Chat
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {threads?.map((thread) => (
            <ThreadListItem
              key={thread.id}
              thread={thread}
              isSelected={selectedThreadId === thread.id}
              isEditing={editingThreadId === thread.id}
              newName={newThreadName}
              onSelect={onThreadSelect}
              onEditStart={handleEditStart}
              onEditSubmit={handleEditSubmit}
              onNameChange={setNewThreadName}
              onDeleteClick={setThreadToDelete}
            />
          ))}
        </div>
      </ScrollArea>

      <DeleteThreadDialog
        isOpen={!!threadToDelete}
        onClose={() => setThreadToDelete(null)}
        onConfirm={() => {
          if (threadToDelete) {
            deleteThread.mutate(threadToDelete, {
              onSuccess: () => {
                if (selectedThreadId === threadToDelete) {
                  onThreadSelect("");
                }
              },
            });
          }
          setThreadToDelete(null);
        }}
      />
    </div>
  );
}