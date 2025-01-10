import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { ThreadListItem } from "./ThreadListItem";
import { DeleteThreadDialog } from "./DeleteThreadDialog";

interface ThreadPanelProps {
  selectedThreadId: string | null;
  onThreadSelect: (threadId: string) => void;
}

export function ThreadPanel({ selectedThreadId, onThreadSelect }: ThreadPanelProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [newThreadName, setNewThreadName] = useState("");
  const [threadToDelete, setThreadToDelete] = useState<string | null>(null);

  const { data: threads, isLoading } = useQuery({
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

  const createThread = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("threads")
        .insert({
          name: "New Chat",
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (newThread) => {
      queryClient.invalidateQueries({ queryKey: ["threads"] });
      onThreadSelect(newThread.id);
      toast({
        title: "Success",
        description: "New chat created",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create chat: " + error.message,
        variant: "destructive",
      });
    },
  });

  const updateThreadName = useMutation({
    mutationFn: async ({ threadId, name }: { threadId: string; name: string }) => {
      const { error } = await supabase
        .from("threads")
        .update({ name })
        .eq("id", threadId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["threads"] });
      setEditingThreadId(null);
      toast({
        title: "Success",
        description: "Chat name updated",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update chat name: " + error.message,
        variant: "destructive",
      });
    },
  });

  const deleteThread = useMutation({
    mutationFn: async (threadId: string) => {
      const { error } = await supabase
        .from("threads")
        .delete()
        .eq("id", threadId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["threads"] });
      setThreadToDelete(null);
      if (selectedThreadId === threadToDelete) {
        onThreadSelect("");
      }
      toast({
        title: "Success",
        description: "Chat deleted",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete chat: " + error.message,
        variant: "destructive",
      });
    },
  });

  const handleEditStart = (thread: any) => {
    setEditingThreadId(thread.id);
    setNewThreadName(thread.name);
  };

  const handleEditSubmit = (threadId: string) => {
    if (newThreadName.trim()) {
      updateThreadName.mutate({ threadId, name: newThreadName.trim() });
    }
  };

  // Subscribe to thread name changes
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
        (payload) => {
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
          onClick={() => createThread.mutate()}
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
        onConfirm={() => threadToDelete && deleteThread.mutate(threadToDelete)}
      />
    </div>
  );
}