import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar } from "@/components/ui/avatar";
import { Loader2 } from "lucide-react";
import { ThreadSearch } from "./ThreadSearch";
import { useState } from "react";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Json } from "@/integrations/supabase/types";

interface MessageMetadata {
  intent?: 'analysis' | 'search' | 'conversation';
  fileReference?: boolean;
}

interface Message {
  id: string;
  content: string;
  role_id: string | null;
  created_at: string;
  response_order: number | null;
  chain_id: string | null;
  metadata: Json | null;
  role?: {
    name: string;
    tag: string;
    special_capabilities?: string[];
  } | null;
}

interface MessageListProps {
  messages: Message[] | undefined;
  isLoading: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  threadId: string | null;
}

export function MessageList({ messages, isLoading, messagesEndRef, threadId }: MessageListProps) {
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
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

  const scrollToMessage = (messageId: string) => {
    setHighlightedMessageId(messageId);
    const messageElement = document.getElementById(messageId);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const messageCount = messages?.length || 0;
  const maxMessages = hasSubscription ? Infinity : (freeTierLimits?.max_messages_per_thread || 10);

  const getMessageClasses = (message: Message) => {
    const baseClasses = "rounded-lg transition-all duration-300";
    const alignmentClasses = message.role_id ? "mr-auto" : "ml-auto flex-row-reverse";
    const highlightClasses = highlightedMessageId === message.id 
      ? "bg-yellow-100 dark:bg-yellow-900/30 animate-highlight"
      : "";
    
    const metadata = message.metadata as MessageMetadata | null;
    const intentClass = metadata?.intent === 'analysis' 
      ? "border-l-2 border-blue-500" 
      : metadata?.intent === 'search' 
        ? "border-l-2 border-green-500" 
        : "";
    
    return cn(
      baseClasses,
      alignmentClasses,
      highlightClasses,
      intentClass
    );
  };

  return (
    <ScrollArea className="h-full">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <ThreadSearch 
          messages={messages || []} 
          onMatchFound={scrollToMessage}
        />
        {!hasSubscription && threadId && (
          <div className="text-xs text-muted-foreground text-center py-1">
            {messageCount}/{maxMessages} messages used
          </div>
        )}
      </div>
      <div className="space-y-3 max-w-[95%] sm:max-w-4xl mx-auto p-2 sm:p-4">
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
              className={`flex gap-2 sm:gap-3 max-w-[95%] sm:max-w-[80%] ${getMessageClasses(message)}`}
            >
              {message.role && (
                <Avatar className="h-6 w-6 sm:h-8 sm:w-8 bg-gradient-primary text-primary-foreground ring-2 ring-primary/10">
                  <span className="text-[10px] sm:text-xs font-semibold">
                    {message.role.tag}
                  </span>
                </Avatar>
              )}
              <div className={`flex-1 ${message.role_id ? "" : "text-right"}`}>
                {message.role && (
                  <div className="flex items-center gap-1 sm:gap-2 mb-0.5 sm:mb-1">
                    <div className="font-semibold text-xs sm:text-sm text-primary">
                      {message.role.name}
                    </div>
                    <div className="text-[10px] sm:text-xs text-muted-foreground">
                      {new Date(message.created_at).toLocaleTimeString()}
                    </div>
                  </div>
                )}
                <div 
                  className={`text-xs sm:text-sm whitespace-pre-wrap leading-relaxed p-2 sm:p-4 rounded-lg ${
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
        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  );
}