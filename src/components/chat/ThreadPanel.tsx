import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { DeleteThreadDialog } from "./DeleteThreadDialog";
import { useThreadMutations } from "@/hooks/useThreadMutations";
import { useThreadSubscription } from "@/hooks/useThreadSubscription";
import { ThreadList } from "./ThreadList";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useToast } from "@/hooks/use-toast";

interface ThreadPanelProps {
  selectedThreadId: string | null;
  onThreadSelect: (threadId: string) => void;
  onThreadCreated?: (threadId: string) => void;
  isCollapsed?: boolean;
}

export function ThreadPanel({ 
  selectedThreadId, 
  onThreadSelect, 
  onThreadCreated,
  isCollapsed = false 
}: ThreadPanelProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [newThreadName, setNewThreadName] = useState("");
  const [threadToDelete, setThreadToDelete] = useState<string | null>(null);
  const { createThread, updateThreadName, deleteThread } = useThreadMutations();
  const { hasSubscription } = useSubscription();

  useThreadSubscription();

  // Get thread count and free tier limits
  const { data: threads } = useQuery({
    queryKey: ["threads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("threads")
        .select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: freeTierLimits } = useQuery({
    queryKey: ["free-tier-limits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("free_tier_limits")
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
  });

  const threadCount = threads?.length || 0;
  const maxThreads = freeTierLimits?.max_threads || 3;
  const isAtThreadLimit = !hasSubscription && threadCount >= maxThreads;

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
    
    if (isAtThreadLimit) {
      toast({
        title: "Thread limit reached",
        description: "Upgrade to create unlimited threads",
        variant: "destructive",
      });
      return;
    }

    createThread.mutate(user.id, {
      onSuccess: (newThread) => {
        onThreadCreated?.(newThread.id);
        onThreadSelect(newThread.id);
      },
    });
  };

  return (
    <div className="h-full flex flex-col">
      <div className={cn(
        "p-4 border-b shrink-0",
        isCollapsed && "p-2"
      )}>
        {!hasSubscription && !isCollapsed && (
          <div className="text-sm text-muted-foreground mb-2">
            {threadCount}/{maxThreads} threads used
          </div>
        )}
        <Button
          className={cn(
            "w-full",
            isCollapsed && "p-2 h-auto"
          )}
          onClick={handleCreateThread}
          disabled={createThread.isPending || isAtThreadLimit}
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