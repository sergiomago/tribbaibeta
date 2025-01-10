import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { DeleteThreadDialog } from "./DeleteThreadDialog";
import { useThreadMutations } from "@/hooks/useThreadMutations";
import { useThreadSubscription } from "@/hooks/useThreadSubscription";
import { ThreadList } from "./ThreadList";
import { cn } from "@/lib/utils";

interface ThreadPanelProps {
  selectedThreadId: string | null;
  onThreadSelect: (threadId: string) => void;
  isCollapsed?: boolean;
}

export function ThreadPanel({ selectedThreadId, onThreadSelect, isCollapsed = false }: ThreadPanelProps) {
  const { user } = useAuth();
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [newThreadName, setNewThreadName] = useState("");
  const [threadToDelete, setThreadToDelete] = useState<string | null>(null);
  const { createThread, updateThreadName, deleteThread } = useThreadMutations();

  useThreadSubscription();

  const handleEditStart = (thread: any) => {
    if (isCollapsed) return;
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

  return (
    <div className="h-full flex flex-col">
      <div className={cn(
        "p-4 border-b",
        isCollapsed && "p-2"
      )}>
        <Button
          className={cn(
            "w-full",
            isCollapsed && "p-2 h-auto"
          )}
          onClick={handleCreateThread}
          disabled={createThread.isPending}
        >
          <Plus className="h-4 w-4" />
          {!isCollapsed && <span className="ml-2">New Chat</span>}
        </Button>
      </div>

      <div className="flex-1 overflow-hidden">
        <ThreadList
          selectedThreadId={selectedThreadId}
          editingThreadId={editingThreadId}
          newThreadName={newThreadName}
          onThreadSelect={onThreadSelect}
          onEditStart={handleEditStart}
          onEditSubmit={handleEditSubmit}
          onNameChange={setNewThreadName}
          onDeleteClick={setThreadToDelete}
          isCollapsed={isCollapsed}
        />
      </div>

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