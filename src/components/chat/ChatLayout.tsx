import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { RoleManagementBar } from "./RoleManagementBar";
import { ChatInput } from "./ChatInput";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MessageList } from "./MessageList";
import { ThreadPanel } from "./ThreadPanel";
import { SearchBar } from "./SearchBar";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function ChatLayout() {
  const [searchParams] = useSearchParams();
  const roleId = searchParams.get('role');
  const [chatSidebarSize, setChatSidebarSize] = useState(20);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const messageListRef = useRef<HTMLDivElement>(null);

  const { data: messages, refetch: refetchMessages, isLoading: isLoadingMessages } = useQuery({
    queryKey: ["messages", currentThreadId],
    queryFn: async () => {
      if (!currentThreadId) return [];
      const { data, error } = await supabase
        .from("messages")
        .select(`
          *,
          role:roles!messages_role_id_fkey(name, tag)
        `)
        .eq("thread_id", currentThreadId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!currentThreadId,
  });

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentThreadId]);

  useEffect(() => {
    if (!currentThreadId) return;

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `thread_id=eq.${currentThreadId}`,
        },
        () => {
          refetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentThreadId, refetchMessages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

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
              isCollapsed={isSidebarCollapsed}
            />
          </div>
        </div>
      </ResizablePanel>

      <ResizableHandle className="w-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" />

      <ResizablePanel defaultSize={100 - chatSidebarSize} className="min-w-[300px]">
        <div className="h-full flex flex-col">
          <RoleManagementBar threadId={currentThreadId} />
          
          <div className="flex-1 overflow-hidden relative">
            <div className="absolute inset-0" ref={messageListRef}>
              <MessageList
                messages={messages}
                isLoading={isLoadingMessages}
                messagesEndRef={messagesEndRef}
              />
            </div>
          </div>

          {currentThreadId ? (
            <ChatInput 
              threadId={currentThreadId} 
              onMessageSent={refetchMessages} 
            />
          ) : (
            <div className="border-t p-4 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm text-center text-muted-foreground">
              Select or create a chat to start chatting
            </div>
          )}
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}