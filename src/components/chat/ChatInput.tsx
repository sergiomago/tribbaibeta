import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface ChatInputProps {
  threadId: string;
  hasRoles: boolean;
  onMessageSent?: () => void;
}

export function ChatInput({ threadId, hasRoles, onMessageSent }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showRoleWarning, setShowRoleWarning] = useState(false);
  const { toast } = useToast();

  const handleSend = async () => {
    if (!message.trim()) return;
    
    if (!threadId) {
      toast({
        title: "Error",
        description: "No chat thread selected.",
        variant: "destructive",
      });
      return;
    }

    if (!hasRoles) {
      setShowRoleWarning(true);
      return;
    }

    setIsSending(true);
    try {
      console.log('Sending message:', { threadId, content: message });
      const { error } = await supabase.functions.invoke("handle-chat-message", {
        body: {
          threadId,
          content: message,
        },
      });

      if (error) throw error;

      setMessage("");
      setShowRoleWarning(false);
      onMessageSent?.();
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t p-4 bg-background mt-auto space-y-4">
      {showRoleWarning && !hasRoles && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please add at least one role to start the conversation.
          </AlertDescription>
        </Alert>
      )}
      <div className="flex gap-2">
        <Input
          placeholder="Type your message..."
          className="flex-1"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isSending}
        />
        <Button 
          onClick={handleSend} 
          disabled={isSending}
        >
          {isSending ? "Sending..." : "Send"}
        </Button>
      </div>
    </div>
  );
}