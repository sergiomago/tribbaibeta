import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { SearchBar } from "./SearchBar";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThreadPanel } from "./ThreadPanel";
import { ChatContent } from "./ChatContent";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/contexts/SubscriptionContext";

export function ChatLayout() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const threadParam = searchParams.get('thread');
  const roleParam = searchParams.get('role');
  const [chatSidebarSize, setChatSidebarSize] = useState(20);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(threadParam);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const messageListRef = useRef<HTMLDivElement>(null);
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

  // Handle role parameter when thread is created
  const handleThreadCreated = async (threadId: string) => {
    if (roleParam) {
      // Associate role with the new thread
      const { error } = await supabase
        .from('thread_roles')
        .insert({ thread_id: threadId, role_id: roleParam });
      
      if (!error) {
        // Clear role parameter and set thread parameter
        setSearchParams({ thread: threadId });
      }
    }
    setCurrentThreadId(threadId);
  };

  // Update currentThreadId when URL parameter changes
  useEffect(() => {
    if (threadParam) {
      setCurrentThreadId(threadParam);
    }
  }, [threadParam]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentThreadId]);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const handleSearchResultSelect = (threadId: string, messageId: string) => {
    setCurrentThreadId(threadId);
    // Wait for messages to load before scrolling
    setTimeout(() => {
      const messageElement = document.getElementById(messageId);
      if (messageElement) {
        messageElement.scrollIntoView({ behavior: "smooth" });
        messageElement.classList.add("bg-primary/5");
        setTimeout(() => {
          messageElement.classList.remove("bg-primary/5");
        }, 2000);
      }
    }, 100);
  };

  return (
    <ResizablePanelGroup 
      direction="horizontal" 
      className="h-full"
    >
      <ResizablePanel
        defaultSize={chatSidebarSize}
        onResize={(size) => setChatSidebarSize(size)}
        className={cn(
          "min-w-[50px] transition-all duration-300",
          isSidebarCollapsed ? "!w-[50px] !min-w-[50px] !max-w-[50px]" : "min-w-[250px]"
        )}
      >
        <div className="h-full flex flex-col">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 m-2"
            onClick={toggleSidebar}
          >
            {isSidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
          {!isSidebarCollapsed && (
            <div className="px-2">
              <SearchBar onResultSelect={handleSearchResultSelect} />
            </div>
          )}
          <div className="flex-1 overflow-hidden">
            <ThreadPanel
              selectedThreadId={currentThreadId}
              onThreadSelect={setCurrentThreadId}
              onThreadCreated={handleThreadCreated}
              isCollapsed={isSidebarCollapsed}
            />
          </div>
        </div>
      </ResizablePanel>

      <ResizableHandle className="w-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" />

      <ResizablePanel defaultSize={100 - chatSidebarSize} className="min-w-[300px]">
        <ChatContent 
          threadId={currentThreadId}
          messageListRef={messageListRef}
          messagesEndRef={messagesEndRef}
          maxMessages={hasSubscription ? Infinity : (freeTierLimits?.max_messages_per_thread || 10)}
        />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}