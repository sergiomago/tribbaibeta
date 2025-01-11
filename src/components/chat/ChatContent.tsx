import { RoleManagementBar } from "./RoleManagementBar";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";
import { RefObject } from "react";
import { useMessages } from "@/hooks/useMessages";

interface ChatContentProps {
  threadId: string | null;
  messageListRef: RefObject<HTMLDivElement>;
  messagesEndRef: RefObject<HTMLDivElement>;
}

export function ChatContent({ threadId, messageListRef, messagesEndRef }: ChatContentProps) {
  const { messages, refetchMessages, isLoadingMessages } = useMessages(threadId);

  return (
    <div className="h-full flex flex-col">
      <RoleManagementBar threadId={threadId} />
      
      <div className="flex-1 overflow-hidden relative">
        <div className="absolute inset-0" ref={messageListRef}>
          <MessageList
            messages={messages}
            isLoading={isLoadingMessages}
            messagesEndRef={messagesEndRef}
          />
        </div>
      </div>

      {threadId ? (
        <ChatInput 
          threadId={threadId} 
          onMessageSent={refetchMessages} 
        />
      ) : (
        <div className="border-t p-4 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm text-center text-muted-foreground">
          Select or create a chat to start chatting
        </div>
      )}
    </div>
  );
}