import { useRef } from "react";
import { useMessages } from "@/hooks/useMessages";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";
import { RoleManagementBar } from "./RoleManagementBar";

interface ChatContentProps {
  threadId: string | null;
  messageListRef?: React.RefObject<HTMLDivElement>;
  messagesEndRef?: React.RefObject<HTMLDivElement>;
}

export function ChatContent({ threadId, messageListRef, messagesEndRef = useRef<HTMLDivElement>(null) }: ChatContentProps) {
  const { messages, refetchMessages, isLoadingMessages } = useMessages(threadId);

  if (!threadId) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        Select a thread to start chatting
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <RoleManagementBar threadId={threadId} />
      <div className="flex-1 overflow-hidden" ref={messageListRef}>
        <MessageList 
          messages={messages} 
          isLoading={isLoadingMessages} 
          messagesEndRef={messagesEndRef}
          threadId={threadId}
        />
      </div>
      <ChatInput threadId={threadId} onMessageSent={refetchMessages} />
    </div>
  );
}