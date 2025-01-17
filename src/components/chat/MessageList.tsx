import { useEffect, useRef } from "react";
import { Message } from "@/types";
import { MessageControls } from "./MessageControls";
import { cn } from "@/lib/utils";
import { useMemoryManagement } from "@/hooks/useMemoryManagement";
import { Shield, ShieldCheck, ShieldX, AlertCircle } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";

interface MessageListProps {
  messages: Message[];
  threadId: string | null;
  messageListRef: React.RefObject<HTMLDivElement>;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  maxMessages?: number;
}

export function MessageList({
  messages,
  threadId,
  messageListRef,
  messagesEndRef,
  maxMessages = Infinity,
}: MessageListProps) {
  const lastMessageRef = useRef<HTMLDivElement>(null);
  const { memories } = useMemoryManagement(threadId);

  useEffect(() => {
    if (lastMessageRef.current) {
      lastMessageRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const getVerificationIcon = (messageId: string) => {
    const memory = memories?.find(m => m.metadata?.message_id === messageId);
    if (!memory) return null;

    const status = memory.metadata?.verification_status;
    const score = memory.metadata?.verification_score || 0;

    switch (status) {
      case 'verified':
        return (
          <Tooltip content={`Verified (Score: ${(score * 100).toFixed(1)}%)`}>
            <ShieldCheck className="h-4 w-4 text-green-500" />
          </Tooltip>
        );
      case 'partially_verified':
        return (
          <Tooltip content={`Partially Verified (Score: ${(score * 100).toFixed(1)}%)`}>
            <Shield className="h-4 w-4 text-yellow-500" />
          </Tooltip>
        );
      case 'needs_verification':
        return (
          <Tooltip content="Needs Verification">
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </Tooltip>
        );
      case 'contradicted':
        return (
          <Tooltip content="Contradicted Information">
            <ShieldX className="h-4 w-4 text-red-500" />
          </Tooltip>
        );
      default:
        return null;
    }
  };

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
            "flex items-start gap-4 transition-colors",
            message.role?.tag === "user" ? "flex-row-reverse" : "flex-row"
          )}
        >
          <div
            className={cn(
              "rounded-lg px-4 py-2 max-w-[80%] space-y-2",
              message.role?.tag === "user"
                ? "bg-primary text-primary-foreground"
                : "bg-muted"
            )}
          >
            {message.role?.tag !== "user" && (
              <div className="flex items-center gap-2 text-sm font-medium">
                {message.role?.name}
                {getVerificationIcon(message.id)}
              </div>
            )}
            <div className="text-sm whitespace-pre-wrap">{message.content}</div>
            <MessageControls message={message} />
          </div>
          {index === messages.length - 1 && (
            <div ref={lastMessageRef} />
          )}
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}