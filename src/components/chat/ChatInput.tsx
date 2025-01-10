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
  const { toast } = useToast();

  const handleSend = async () => {
    if (!message.trim()) return;
    if (!hasRoles) {
      toast({
        title: "No roles assigned",
        description: "Please add at least one role to the thread before sending messages.",
        variant: "destructive",
      });
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
      {!hasRoles && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please add at least one role to start the conversation.
          </AlertDescription>
        </Alert>
      )}
      <div className="flex gap-2">
        <Input
          placeholder={hasRoles ? "Type your message..." : "Add a role to start chatting..."}
          className="flex-1"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isSending || !hasRoles}
        />
        <Button 
          onClick={handleSend} 
          disabled={isSending || !hasRoles}
        >
          {isSending ? "Sending..." : "Send"}
        </Button>
      </div>
    </div>
  );
}