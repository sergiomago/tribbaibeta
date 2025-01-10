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
import { Loader2 } from "lucide-react";

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
    <ResizablePanelGroup 
      direction="horizontal" 
      className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-purple-50 to-white dark:from-gray-900 dark:to-gray-800"
    >
      <ResizablePanel
        defaultSize={chatSidebarSize}
        onResize={(size) => setChatSidebarSize(size)}
        className="min-w-[250px] border-r border-gray-200 dark:border-gray-700"
      >
        <ChatSidebar
          defaultSize={chatSidebarSize}
          onResize={setChatSidebarSize}
          onThreadSelect={setCurrentThreadId}
        />
      </ResizablePanel>

      <ResizableHandle className="w-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" />

      <ResizablePanel defaultSize={100 - chatSidebarSize}>
        <div className="flex flex-col h-[calc(100vh-4rem)]">
          <RoleManagementBar threadId={currentThreadId} />

          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4 max-w-4xl mx-auto">
              {isLoadingMessages ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : messages?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No messages yet. Start the conversation!
                </div>
              ) : (
                messages?.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${
                      message.role_id 
                        ? "bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow" 
                        : "bg-primary/5 rounded-lg p-4"
                    } animate-fade-in`}
                  >
                    {message.role && (
                      <Avatar className="h-8 w-8 bg-gradient-primary text-primary-foreground ring-2 ring-primary/10">
                        <span className="text-xs font-semibold">
                          {message.role.tag}
                        </span>
                      </Avatar>
                    )}
                    <div className="flex-1">
                      {message.role && (
                        <div className="flex items-center gap-2 mb-1">
                          <div className="font-semibold text-sm text-primary">
                            {message.role.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(message.created_at).toLocaleTimeString()}
                          </div>
                        </div>
                      )}
                      <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                        {message.content}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          {currentThreadId ? (
            <ChatInput threadId={currentThreadId} onMessageSent={refetchMessages} />
          ) : (
            <div className="border-t p-4 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm text-center text-muted-foreground">
              Select or create a thread to start chatting
            </div>
          )}
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
