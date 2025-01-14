import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Send, Upload, Search, Image } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { UpgradeSubscriptionCard } from "@/components/subscription/UpgradeSubscriptionCard";

interface ChatInputProps {
  threadId: string;
  onMessageSent?: () => void;
  disabled?: boolean;
  messageCount?: number;
  maxMessages?: number;
}

export function ChatInput({ 
  threadId, 
  onMessageSent,
  disabled = false,
  messageCount = 0,
  maxMessages = Infinity
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { hasSubscription } = useSubscription();

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

  // Check if special roles are present
  const hasDocAnalyst = threadRoles?.some(tr => 
    tr.role?.special_capabilities?.includes('document_analysis')
  );
  const hasWebSearcher = threadRoles?.some(tr => 
    tr.role?.special_capabilities?.includes('web_search')
  );

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

    if (disabled || messageCount >= maxMessages) {
      toast({
        title: "Message limit reached",
        description: hasSubscription 
          ? "You've reached the message limit for this thread."
          : "Upgrade to send more messages in this thread.",
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const { error } = await supabase.functions.invoke("upload-file", {
        body: formData,
      });

      if (error) throw error;

      toast({
        title: "File uploaded",
        description: "Your file has been uploaded successfully.",
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({
        title: "Upload failed",
        description: "Failed to upload file. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const { error } = await supabase.functions.invoke("upload-file", {
        body: formData,
      });

      if (error) throw error;

      toast({
        title: "Image uploaded",
        description: "Your image has been uploaded successfully.",
      });
    } catch (error) {
      console.error("Error uploading image:", error);
      toast({
        title: "Upload failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const showUpgradeCard = !hasSubscription && messageCount >= maxMessages;

  return (
    <div className="border-t bg-background mt-auto">
      {showUpgradeCard && (
        <div className="p-4 border-b">
          <UpgradeSubscriptionCard 
            variant="compact" 
            showCreatorPlan={true}
            context="messages"
          />
        </div>
      )}
      <div className="p-2 sm:p-4">
        <div className="flex flex-col gap-2 max-w-[95%] sm:max-w-4xl mx-auto">
          <div className="text-xs text-muted-foreground text-center">
            {messageCount < maxMessages ? (
              <span>{messageCount}/{maxMessages} messages used</span>
            ) : (
              <span className="text-destructive">
                Message limit reached. {!hasSubscription && "Upgrade to send more messages."}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {hasDocAnalyst && (
              <>
                <Input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                  id="file-upload"
                  onChange={handleFileUpload}
                />
                <Input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  id="image-upload"
                  onChange={handleImageUpload}
                />
                <Button 
                  variant="outline" 
                  size={isMobile ? "sm" : "default"}
                  onClick={() => document.getElementById('file-upload')?.click()}
                  className="shrink-0"
                >
                  <Upload className="h-4 w-4" />
                  {!isMobile && <span className="ml-2">Upload File</span>}
                </Button>
                <Button 
                  variant="outline"
                  size={isMobile ? "sm" : "default"}
                  onClick={() => document.getElementById('image-upload')?.click()}
                  className="shrink-0"
                >
                  <Image className="h-4 w-4" />
                  {!isMobile && <span className="ml-2">Upload Image</span>}
                </Button>
              </>
            )}
            {hasWebSearcher && (
              <Button 
                variant="outline"
                size={isMobile ? "sm" : "default"}
                onClick={() => {
                  setMessage(prev => prev + " @web search: ");
                }}
                className="shrink-0"
              >
                <Search className="h-4 w-4" />
                {!isMobile && <span className="ml-2">Web Search</span>}
              </Button>
            )}
            <Input
              placeholder={disabled ? "Message limit reached" : "Type your message..."}
              className="flex-1 text-base sm:text-sm"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isSending || disabled}
            />
            <Button 
              onClick={handleSend} 
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
          </div>
        </div>
      </div>
    </div>
  );
}