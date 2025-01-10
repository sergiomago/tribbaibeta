import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { DeleteThreadDialog } from "./DeleteThreadDialog";
import { useThreadMutations } from "@/hooks/useThreadMutations";
import { useThreadSubscription } from "@/hooks/useThreadSubscription";
import { ThreadList } from "./ThreadList";

interface ThreadPanelProps {
  selectedThreadId: string | null;
  onThreadSelect: (threadId: string) => void;
}

export function ThreadPanel({ selectedThreadId, onThreadSelect }: ThreadPanelProps) {
  const { user } = useAuth();
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [newThreadName, setNewThreadName] = useState("");
  const [threadToDelete, setThreadToDelete] = useState<string | null>(null);
  const { createThread, deleteThread } = useThreadMutations();

  // Subscribe to thread changes
  useThreadSubscription();

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

      <ThreadList
        selectedThreadId={selectedThreadId}
        editingThreadId={editingThreadId}
        newThreadName={newThreadName}
        onThreadSelect={onThreadSelect}
        onEditStart={handleEditStart}
        onEditSubmit={handleEditSubmit}
        onNameChange={setNewThreadName}
        onDeleteClick={setThreadToDelete}
      />

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