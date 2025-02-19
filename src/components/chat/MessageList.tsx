import { useEffect, useRef } from "react";
import { Message } from "@/types";
import { cn } from "@/lib/utils";
import { useMemoryManagement } from "@/hooks/useMemoryManagement";
import { Shield, ShieldCheck, ShieldX, AlertCircle, ArrowDown, MessageSquare, Loader2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MessageListProps {
  messages: Message[];
  threadId: string | null;
  messageListRef: React.RefObject<HTMLDivElement>;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  maxMessages?: number;
  isLoading: boolean;
}

export function MessageList({
  messages,
  threadId,
  messageListRef,
  messagesEndRef,
  maxMessages = Infinity,
  isLoading
}: MessageListProps) {
  const lastMessageRef = useRef<HTMLDivElement>(null);
  const { memories } = useMemoryManagement(threadId);

  useEffect(() => {
    if (lastMessageRef.current) {
      lastMessageRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const getVerificationIcon = (messageId: string) => {
    const memory = memories?.find(m => {
      const metadata = m.metadata as Record<string, any>;
      return metadata?.message_id === messageId;
    });
    
    if (!memory?.metadata || typeof memory.metadata !== 'object') return null;

    const metadata = memory.metadata as Record<string, any>;
    const status = metadata.verification_status;
    const score = metadata.verification_score || 0;

    switch (status) {
      case 'verified':
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <ShieldCheck className="h-4 w-4 text-green-500" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Verified (Score: {(score * 100).toFixed(1)}%)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      case 'partially_verified':
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Shield className="h-4 w-4 text-yellow-500" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Partially Verified (Score: {(score * 100).toFixed(1)}%)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      case 'needs_verification':
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <AlertCircle className="h-4 w-4 text-orange-500" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Needs Verification</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      case 'contradicted':
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <ShieldX className="h-4 w-4 text-red-500" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Contradicted Information</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      default:
        return null;
    }
  };

  const renderChainIndicator = (message: Message) => {
    if (message.chain_position && message.chain_position > 1) {
      return (
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
          <MessageSquare className="h-3 w-3" />
          <span>Chain Response #{message.chain_position}</span>
        </div>
      );
    }
    return null;
  };

  const renderThreadIndicator = (message: Message) => {
    if (message.parent) {
      return (
        <div className="flex items-center text-xs text-muted-foreground">
          <ArrowDown className="h-3 w-3 mr-1" />
          <span>Reply to: {message.parent.content.substring(0, 30)}...</span>
        </div>
      );
    }
    return null;
  };

  if (isLoading && messages.length === 0) {
    return (
      <div className="flex-1 p-4 flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading messages...</span>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={messageListRef}
      className="flex-1 overflow-y-auto p-4 space-y-4"
    >
      {messages.slice(-maxMessages).map((message, index) => (
        <div
          key={message.id}
          id={message.id}
          className={cn(
            "flex flex-col gap-1",
            message.depth_level > 1 && "ml-6",
            "animate-fade-in"
          )}
        >
          {renderChainIndicator(message)}
          {renderThreadIndicator(message)}
          <div className={cn(
            "flex items-start gap-4",
            message.role?.tag === "user" ? "flex-row-reverse" : "flex-row"
          )}>
            <div
              className={cn(
                "rounded-lg px-4 py-2 max-w-[80%] space-y-2",
                message.role?.tag === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/90 transition-colors"
              )}
            >
              {message.role?.tag !== "user" && (
                <div className="flex items-center gap-2 text-sm font-medium">
                  {message.role?.name}
                  {getVerificationIcon(message.id)}
                  {message.metadata?.streaming && (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  )}
                </div>
              )}
              <div className="text-sm whitespace-pre-wrap">{message.content}</div>
            </div>
            {index === messages.length - 1 && (
              <div ref={lastMessageRef} />
            )}
          </div>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}
