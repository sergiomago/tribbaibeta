import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";
import { useMessages } from "@/hooks/useMessages";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ChatContentProps {
  threadId: string | null;
  messageListRef: React.RefObject<HTMLDivElement>;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  maxMessages?: number;
}

export function ChatContent({ 
  threadId, 
  messageListRef, 
  messagesEndRef,
  maxMessages = Infinity 
}: ChatContentProps) {
  const { messages, isLoadingMessages } = useMessages(threadId);

  const { data: thread } = useQuery({
    queryKey: ["thread", threadId],
    queryFn: async () => {
      if (!threadId) return null;
      const { data, error } = await supabase
        .from("threads")
        .select("*")
        .eq("id", threadId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!threadId,
  });

  if (!threadId) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        Select a chat to start messaging
      </div>
    );
  }

  const messageCount = messages?.length || 0;
  const canSendMessage = messageCount < maxMessages;

  return (
    <div className="h-full flex flex-col">
      <MessageList
        messages={messages}
        isLoading={isLoadingMessages}
        messagesEndRef={messagesEndRef}
        threadId={threadId}
      />
      <ChatInput 
        threadId={threadId} 
        disabled={!canSendMessage}
        messageCount={messageCount}
        maxMessages={maxMessages}
      />
    </div>
  );
}