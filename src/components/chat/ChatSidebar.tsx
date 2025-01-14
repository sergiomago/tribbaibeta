import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ThreadList } from "./ThreadList";
import { ThreadSearch } from "./ThreadSearch";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { UpgradeSubscriptionCard } from "@/components/subscription/UpgradeSubscriptionCard";

export function ChatSidebar() {
  const navigate = useNavigate();
  const { hasSubscription } = useSubscription();

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

  const maxThreads = freeTierLimits?.max_threads || 3;
  const canCreateThread = hasSubscription || (threadCount || 0) < maxThreads;
  const showUpgradeCard = !hasSubscription && !canCreateThread;

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
        <ThreadSearch />
      </div>

      <ScrollArea className="flex-1">
        <ThreadList />
      </ScrollArea>
    </div>
  );
}