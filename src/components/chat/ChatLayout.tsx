import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ChatSidebar } from "./ChatSidebar";
import { RoleManagementBar } from "./RoleManagementBar";
import { ChatInput } from "./ChatInput";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  content: string;
  role_id: string | null;
  created_at: string;
  response_order: number | null;
  role?: {
    name: string;
    tag: string;
  } | null;
}

export function ChatLayout() {
  const [searchParams] = useSearchParams();
  const roleId = searchParams.get('role');
  const [chatSidebarSize, setChatSidebarSize] = useState(20);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createThreadWithRole = useMutation({
    mutationFn: async (roleId: string) => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error("Not authenticated");

      // Create a new thread
      const { data: thread, error: threadError } = await supabase
        .from("threads")
        .insert({ 
          name: "New Chat",
          user_id: user.id 
        })
        .select()
        .single();

      if (threadError) throw threadError;

      // Add the role to the thread
      const { error: roleError } = await supabase
        .from("thread_roles")
        .insert({ thread_id: thread.id, role_id: roleId });

      if (roleError) throw roleError;

      return thread;
    },
    onSuccess: (thread) => {
      queryClient.invalidateQueries({ queryKey: ["threads"] });
      setCurrentThreadId(thread.id);
      toast({
        title: "Chat created",
        description: "New chat started with the selected role",
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

  // Handle role parameter on mount
  useEffect(() => {
    if (roleId && !currentThreadId) {
      createThreadWithRole.mutate(roleId);
    }
  }, [roleId]);

  const { data: thread } = useQuery({
    queryKey: ["thread", currentThreadId],
    queryFn: async () => {
      if (!currentThreadId) return null;
      const { data, error } = await supabase
        .from("threads")
        .select("*")
        .eq("id", currentThreadId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!currentThreadId,
  });

  const { data: messages, refetch: refetchMessages } = useQuery({
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

  // Subscribe to new messages
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

  const handleMessageSent = () => {
    refetchMessages();
  };

  return (
    <ResizablePanelGroup direction="horizontal" className="min-h-[calc(100vh-4rem)]">
      {/* Chat List Sidebar */}
      <ResizablePanel
        defaultSize={chatSidebarSize}
        onResize={(size) => setChatSidebarSize(size)}
        className="min-w-[250px]"
      >
        <ChatSidebar
          defaultSize={chatSidebarSize}
          onResize={setChatSidebarSize}
          onThreadSelect={setCurrentThreadId}
        />
      </ResizablePanel>

      <ResizableHandle />

      {/* Main Chat Area */}
      <ResizablePanel defaultSize={100 - chatSidebarSize}>
        <div className="flex flex-col h-[calc(100vh-4rem)]">
          <RoleManagementBar threadId={currentThreadId} />

          {/* Messages Container */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages?.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.role_id ? "bg-muted/50 rounded-lg p-4" : ""
                  }`}
                >
                  {message.role && (
                    <Avatar className="h-8 w-8">
                      <span className="text-xs font-semibold">
                        {message.role.tag}
                      </span>
                    </Avatar>
                  )}
                  <div className="flex-1">
                    {message.role && (
                      <div className="font-semibold text-sm text-muted-foreground mb-1">
                        {message.role.name}
                      </div>
                    )}
                    <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {currentThreadId ? (
            <ChatInput threadId={currentThreadId} onMessageSent={handleMessageSent} />
          ) : (
            <div className="border-t p-4 bg-background text-center text-muted-foreground">
              Select or create a thread to start chatting
            </div>
          )}
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}