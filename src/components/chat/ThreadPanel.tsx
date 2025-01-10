import { useEffect, useState } from "react";
import { Plus, MessageSquare, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";

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
            <div
              key={thread.id}
              className={`group rounded-lg transition-colors ${
                selectedThreadId === thread.id
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-muted"
              }`}
            >
              <div className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    {editingThreadId === thread.id ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleEditSubmit(thread.id);
                        }}
                      >
                        <Input
                          value={newThreadName}
                          onChange={(e) => setNewThreadName(e.target.value)}
                          onBlur={() => handleEditSubmit(thread.id)}
                          autoFocus
                          className="h-7"
                        />
                      </form>
                    ) : (
                      <button
                        onClick={() => onThreadSelect(thread.id)}
                        className="flex items-center gap-2 w-full text-left"
                      >
                        <MessageSquare className="h-4 w-4 shrink-0" />
                        <span className="font-medium truncate">{thread.name}</span>
                      </button>
                    )}
                    {thread.last_opened && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {format(new Date(thread.last_opened), "MMM d, yyyy")}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleEditStart(thread)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => setThreadToDelete(thread.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <AlertDialog open={!!threadToDelete} onOpenChange={() => setThreadToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Chat</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this chat? This action cannot be undone and all messages
              will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => threadToDelete && deleteThread.mutate(threadToDelete)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}