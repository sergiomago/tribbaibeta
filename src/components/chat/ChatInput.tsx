import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface ChatInputProps {
  threadId: string;
  onMessageSent?: () => void;
}

export function ChatInput({ threadId, onMessageSent }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();

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
    <div className="border-t p-2 sm:p-4 bg-background mt-auto">
      <div className="flex gap-2 max-w-[95%] sm:max-w-4xl mx-auto">
        <Input
          placeholder="Type your message..."
          className="flex-1 text-base sm:text-sm"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isSending}
        />
        <Button 
          onClick={handleSend} 
          disabled={isSending}
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
      </div>
    </div>
  );
}