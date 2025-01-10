import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar } from "@/components/ui/avatar";
import { Loader2 } from "lucide-react";
import { ThreadSearch } from "./ThreadSearch";
import { useState } from "react";

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

interface MessageListProps {
  messages: Message[] | undefined;
  isLoading: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

export function MessageList({ messages, isLoading, messagesEndRef }: MessageListProps) {
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  const scrollToMessage = (messageId: string) => {
    setHighlightedMessageId(messageId);
    const messageElement = document.getElementById(messageId);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  return (
    <ScrollArea className="h-full">
      <div className="sticky top-0 z-10">
        <ThreadSearch 
          messages={messages || []} 
          onMatchFound={scrollToMessage}
        />
      </div>
      <div className="space-y-4 max-w-4xl mx-auto p-4">
        {isLoading ? (
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
              id={message.id}
              className={`flex gap-3 max-w-[80%] animate-fade-in transition-colors duration-300 rounded-lg ${
                message.role_id 
                  ? "mr-auto" // AI message aligned left
                  : "ml-auto flex-row-reverse" // User message aligned right
              } ${
                highlightedMessageId === message.id 
                  ? "bg-primary/5"
                  : ""
              }`}
            >
              {message.role && (
                <Avatar className="h-8 w-8 bg-gradient-primary text-primary-foreground ring-2 ring-primary/10">
                  <span className="text-xs font-semibold">
                    {message.role.tag}
                  </span>
                </Avatar>
              )}
              <div className={`flex-1 ${message.role_id ? "" : "text-right"}`}>
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
                <div 
                  className={`text-sm whitespace-pre-wrap leading-relaxed p-4 rounded-lg ${
                    message.role_id
                      ? "bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow"
                      : "bg-primary/10 text-left"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} /> {/* Scroll anchor */}
      </div>
    </ScrollArea>
  );
}