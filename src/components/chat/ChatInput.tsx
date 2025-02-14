
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { FileUploadButtons } from "./FileUploadButtons";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Loader2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { MessageValidation } from "./MessageValidation";
import { FileHandler } from "./FileHandler";
import { MessageCounter } from "./MessageCounter";
import { createRoleOrchestrator } from "@/utils/conversation/orchestration/RoleOrchestrator";
import { supabase } from "@/integrations/supabase/client";

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
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const handleSend = async () => {
    if (!message.trim()) return;
    
    setIsSending(true);
    try {
      // Extract tagged role if present
      const tagMatch = message.match(/@(\w+)/);
      const taggedRoleId = tagMatch ? tagMatch[1] : null;
      
      // First store user message
      const { data: storedMessage, error: messageError } = await supabase
        .from('messages')
        .insert({
          thread_id: threadId,
          content: message.trim(),
          is_bot: false,
          metadata: {
            context_type: 'conversation',
            tagged_role: taggedRoleId
          }
        })
        .select()
        .single();

      if (messageError) throw messageError;

      // Process with orchestrator
      const { data: response, error: fnError } = await supabase.functions.invoke(
        'handle-chat-message',
        {
          body: { 
            threadId, 
            content: message,
            messageId: storedMessage.id,
            taggedRoleId 
          }
        }
      );

      if (fnError) throw fnError;

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

  const fileHandler = FileHandler({ 
    onFileUpload: async (file) => {
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('threadId', threadId);

        const { error } = await supabase.functions.invoke("upload-file", {
          body: formData,
        });

        if (error) throw error;

        toast({
          title: "Success",
          description: "File uploaded successfully.",
        });
        
        onMessageSent?.();
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to upload file. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsUploading(false);
      }
    }
  });

  return (
    <div className="border-t bg-background mt-auto">
      <MessageCounter messageCount={messageCount} maxMessages={maxMessages} />
      <div className="p-2 sm:p-4">
        <div className="flex flex-col gap-2 max-w-[95%] sm:max-w-4xl mx-auto">
          {isUploading && (
            <div className="text-xs text-muted-foreground text-center">
              <Loader2 className="h-4 w-4 animate-spin inline-block mr-2" />
              Uploading file...
            </div>
          )}
          <MessageValidation 
            threadId={threadId}
            messageCount={messageCount}
            maxMessages={maxMessages}
          >
            <div className="flex gap-2">
              <FileUploadButtons
                threadId={threadId}
                onFileUpload={(e) => fileHandler.handleFileUpload(e, 'document')}
                onImageUpload={(e) => fileHandler.handleFileUpload(e, 'image')}
                isUploading={isUploading}
              />
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
                disabled={isSending || disabled || !message.trim()}
                size={isMobile ? "sm" : "default"}
                className="shrink-0"
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {!isMobile && <span className="ml-2">{isSending ? "Sending..." : "Send"}</span>}
              </Button>
            </div>
          </MessageValidation>
        </div>
      </div>
    </div>
  );
}
