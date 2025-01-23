import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Loader2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface ChatInputCoreProps {
  message: string;
  onMessageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSend: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  isSending: boolean;
  disabled?: boolean;
}

export function ChatInputCore({
  message,
  onMessageChange,
  onSend,
  onKeyPress,
  isSending,
  disabled = false,
}: ChatInputCoreProps) {
  const isMobile = useIsMobile();
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex gap-2">
      <Input
        ref={inputRef}
        placeholder={disabled ? "Message limit reached" : "Type your message..."}
        className="flex-1 text-base sm:text-sm"
        value={message}
        onChange={onMessageChange}
        onKeyDown={onKeyPress}
        disabled={isSending || disabled}
      />
      <Button 
        onClick={onSend} 
        disabled={isSending || disabled}
        size={isMobile ? "sm" : "default"}
        className="shrink-0"
      >
        {isSending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {!isMobile && <span className="ml-2">Sending...</span>}
          </>
        ) : (
          <>
            <Send className="h-4 w-4" />
            {!isMobile && <span className="ml-2">Send</span>}
          </>
        )}
      </Button>
    </div>
  );
}