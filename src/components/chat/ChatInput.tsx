import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { createRoleManager } from "@/utils/RoleManager";

interface ChatInputProps {
  threadId: string;
  onMessageSent?: () => void;
}

export function ChatInput({ threadId, onMessageSent }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const handleSend = async () => {
    if (!message.trim()) return;

    setIsSending(true);
    try {
      const roleManager = createRoleManager(threadId);
      const taggedRoleId = extractTaggedRoleId(message);
      
      // Get the conversation chain based on tagged role
      const chain = await roleManager.getConversationChain(taggedRoleId);
      console.log("Conversation chain:", chain);

      const { error } = await supabase.functions.invoke("handle-chat-message", {
        body: {
          threadId,
          content: message,
          taggedRoleId,
          conversationChain: chain
        },
      });

      if (error) throw error;

      setMessage("");
      onMessageSent?.();
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
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
    <div className="border-t p-4 bg-background mt-auto">
      <div className="flex gap-2">
        <Input
          placeholder="Type your message..."
          className="flex-1"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isSending}
        />
        <Button onClick={handleSend} disabled={isSending}>
          {isSending ? "Sending..." : "Send"}
        </Button>
      </div>
    </div>
  );
}

function extractTaggedRoleId(message: string): string | null {
  const match = message.match(/@(\w+)/);
  return match ? match[1] : null;
}