import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

interface ChatInputProps {
  threadId: string;
  onMessageSent?: () => void;
}

export function ChatInput({ threadId, onMessageSent }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  // Query to check if thread has roles
  const { data: threadRoles } = useQuery({
    queryKey: ["thread-roles", threadId],
    queryFn: async () => {
      if (!threadId) return [];
      const { data, error } = await supabase
        .from("thread_roles")
        .select(`
          role:roles (*)
        `)
        .eq("thread_id", threadId);
      if (error) throw error;
      return data;
    },
    enabled: !!threadId,
  });

  const handleSend = async () => {
    if (!message.trim()) return;

    // Check if thread has any roles
    if (!threadRoles?.length) {
      toast({
        title: "No roles assigned",
        description: "Please add at least one role to the chat before sending messages.",
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