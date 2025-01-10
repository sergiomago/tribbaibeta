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

export function ChatLayout() {
  const [searchParams] = useSearchParams();
  const roleId = searchParams.get('role');
  const [chatSidebarSize, setChatSidebarSize] = useState(20);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

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

  return (
    <ResizablePanelGroup 
      direction="horizontal" 
      className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-purple-50 to-white dark:from-gray-900 dark:to-gray-800"
    >
      <ResizablePanel
        defaultSize={chatSidebarSize}
        onResize={(size) => setChatSidebarSize(size)}
        className="min-w-[250px]"
      >
        <ThreadPanel
          selectedThreadId={currentThreadId}
          onThreadSelect={setCurrentThreadId}
        />
      </ResizablePanel>

      <ResizableHandle className="w-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" />

      <ResizablePanel defaultSize={100 - chatSidebarSize}>
        <div className="flex flex-col h-[calc(100vh-4rem)]">
          <RoleManagementBar threadId={currentThreadId} />

          <MessageList
            messages={messages}
            isLoading={isLoadingMessages}
            messagesEndRef={messagesEndRef}
          />

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