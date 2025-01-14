import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ThreadList } from "./ThreadList";
import { ThreadSearch } from "./ThreadSearch";
import { Plus } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { UpgradeSubscriptionCard } from "@/components/subscription/UpgradeSubscriptionCard";
import { useState } from "react";

export function ChatSidebar() {
  const navigate = useNavigate();
  const { threadId } = useParams();
  const { hasSubscription } = useSubscription();
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [newThreadName, setNewThreadName] = useState("");

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

  const { data: threadCount } = useQuery({
    queryKey: ["thread-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("threads")
        .select("*", { count: 'exact' });
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: messages } = useQuery({
    queryKey: ["messages", threadId],
    queryFn: async () => {
      if (!threadId) return [];
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("thread_id", threadId);
      if (error) throw error;
      return data;
    },
    enabled: !!threadId,
  });

  const maxThreads = freeTierLimits?.max_threads || 3;
  const canCreateThread = hasSubscription || (threadCount || 0) < maxThreads;
  const showUpgradeCard = !hasSubscription && !canCreateThread;

  const handleThreadSelect = (threadId: string) => {
    navigate(`/chats/${threadId}`);
  };

  const handleEditStart = (thread: any) => {
    setEditingThreadId(thread.id);
    setNewThreadName(thread.name);
  };

  const handleEditSubmit = async (threadId: string) => {
    if (!newThreadName.trim()) return;
    
    await supabase
      .from("threads")
      .update({ name: newThreadName })
      .eq("id", threadId);
    
    setEditingThreadId(null);
    setNewThreadName("");
  };

  const handleDeleteThread = async (threadId: string) => {
    await supabase
      .from("threads")
      .delete()
      .eq("id", threadId);
  };

  const handleMatchFound = (messageId: string) => {
    // Scroll to message implementation would go here
    console.log("Scroll to message:", messageId);
  };

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="px-2 py-2">
        <Button
          className="w-full justify-start gap-2"
          onClick={() => navigate("/chats/new")}
          disabled={!canCreateThread}
        >
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
        {!hasSubscription && (
          <div className="text-xs text-muted-foreground text-center mt-1">
            {threadCount}/{maxThreads} chats used
          </div>
        )}
      </div>

      {showUpgradeCard && (
        <div className="px-2">
          <UpgradeSubscriptionCard 
            variant="compact" 
            showCreatorPlan={true}
            context="threads"
          />
        </div>
      )}

      <div className="px-2">
        <ThreadSearch 
          messages={messages || []}
          onMatchFound={handleMatchFound}
        />
      </div>

      <ScrollArea className="flex-1">
        <ThreadList 
          selectedThreadId={threadId || null}
          editingThreadId={editingThreadId}
          newThreadName={newThreadName}
          onThreadSelect={handleThreadSelect}
          onEditStart={handleEditStart}
          onEditSubmit={handleEditSubmit}
          onNameChange={setNewThreadName}
          onDeleteClick={handleDeleteThread}
        />
      </ScrollArea>
    </div>
  );
}