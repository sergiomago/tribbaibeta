import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Send } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface MessageControlsProps {
  message: string;
  onMessageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSend: () => void;
  onWebSearch: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  hasWebSearcher: boolean;
  isSending: boolean;
  isSearching: boolean;
  disabled: boolean;
}

export function MessageControls({
  message,
  onMessageChange,
  onSend,
  onWebSearch,
  onKeyPress,
  hasWebSearcher,
  isSending,
  isSearching,
  disabled
}: MessageControlsProps) {
  const isMobile = useIsMobile();

  return (
    <>
      {hasWebSearcher && (
        <Button 
          variant="outline"
          size={isMobile ? "sm" : "default"}
          onClick={onWebSearch}
          className="shrink-0"
          disabled={isSearching}
        >
          <Search className="h-4 w-4" />
          {!isMobile && <span className="ml-2">
            {isSearching ? "Searching..." : "Web Search"}
          </span>}
        </Button>
      )}
      <Input
        placeholder={disabled ? "Message limit reached" : hasWebSearcher ? "Type your message or ask me to search..." : "Type your message..."}
        className="flex-1 text-base sm:text-sm"
        value={message}
        onChange={onMessageChange}
        onKeyPress={onKeyPress}
        disabled={isSending || disabled}
      />
      <Button 
        onClick={onSend} 
        disabled={isSending || disabled}
        size={isMobile ? "sm" : "default"}
        className="shrink-0"
      >
        {isSending ? (
          "Sending..."
        ) : (
          <>
            <Send className="h-4 w-4" />
            {!isMobile && <span className="ml-2">Send</span>}
          </>
        )}
      </Button>
    </>
  );
}