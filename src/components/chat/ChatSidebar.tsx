import { useState } from "react";
import { Plus, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";

interface ChatSidebarProps {
  defaultSize: number;
  onResize: (size: number) => void;
  onThreadSelect: (threadId: string) => void;
}

export function ChatSidebar({ onThreadSelect }: ChatSidebarProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const { hasSubscription } = useSubscription();

  const { data: threads, isLoading } = useQuery({
    queryKey: ["threads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("threads")
        .select("*")
        .order("updated_at", { ascending: false });
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

  const createThread = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("User not authenticated");

      // Create the thread directly in our database
      const { data, error } = await supabase
        .from("threads")
        .insert({
          name: "New Thread",
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (newThread) => {
      queryClient.invalidateQueries({ queryKey: ["threads"] });
      setSelectedThreadId(newThread.id);
      onThreadSelect(newThread.id);
      toast({
        title: "Success",
        description: "New thread created",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create thread: " + error.message,
        variant: "destructive",
      });
    },
  });

  const handleThreadClick = (threadId: string) => {
    setSelectedThreadId(threadId);
    onThreadSelect(threadId);
  };

  const threadCount = threads?.length || 0;
  const maxThreads = hasSubscription ? Infinity : (freeTierLimits?.max_threads || 3);
  const canCreateThread = threadCount < maxThreads;

  const handleCreateThread = () => {
    if (!canCreateThread) {
      toast({
        title: "Thread limit reached",
        description: "Upgrade your plan to create more threads",
        variant: "destructive",
      });
      return;
    }
    createThread.mutate();
  };

  return (
    <div className="h-full flex flex-col border-r">
      <div className="p-4 border-b">
        <Button
          className="w-full"
          onClick={handleCreateThread}
          disabled={createThread.isPending || !canCreateThread}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Thread
        </Button>
        {!hasSubscription && (
          <div className="mt-2 text-xs text-muted-foreground text-center">
            {threadCount}/{maxThreads} threads used
          </div>
        )}
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {threads?.map((thread) => (
            <button
              key={thread.id}
              onClick={() => handleThreadClick(thread.id)}
              className={`w-full p-3 text-left rounded-lg transition-colors ${
                selectedThreadId === thread.id
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-muted"
              }`}
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                <span className="font-medium">{thread.name}</span>
              </div>
              {thread.message_count !== undefined && (
                <div className="text-xs text-muted-foreground mt-1">
                  {thread.message_count}/{!hasSubscription ? (freeTierLimits?.max_messages_per_thread || 10) : "∞"} messages
                </div>
              )}
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}