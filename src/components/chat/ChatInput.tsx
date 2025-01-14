import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { UpgradeSubscriptionCard } from "@/components/subscription/UpgradeSubscriptionCard";
import { FileUploadButtons } from "./FileUploadButtons";
import { MessageControls } from "./MessageControls";
import { detectUrl, detectSearchIntent } from "@/utils/messageDetection";

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
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();
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

  const validateFile = (file: File, type: 'document' | 'image') => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error('File size must be less than 10MB');
    }

    if (type === 'document') {
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Only PDF and Word documents are allowed');
      }
    } else {
      if (!file.type.startsWith('image/')) {
        throw new Error('Only image files are allowed');
      }
    }
  };

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
      const isUrl = detectUrl(message);
      const isSearchIntent = detectSearchIntent(message);
      
      if (hasWebSearcher && (isUrl || isSearchIntent)) {
        setIsSearching(true);
        const { error: searchError } = await supabase.functions.invoke("web-search", {
          body: { content: message }
        });

        if (searchError) throw searchError;
      }

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
      setIsSearching(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      validateFile(file, 'document');
      setIsUploading(true);

      const formData = new FormData();
      formData.append('file', file);

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
        description: error instanceof Error ? error.message : "Failed to upload file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      validateFile(file, 'image');
      setIsUploading(true);

      const formData = new FormData();
      formData.append('file', file);

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
        description: error instanceof Error ? error.message : "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleWebSearch = () => {
    setMessage(prev => prev.trim() ? `${prev} ` : prev);
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
              <FileUploadButtons
                onFileUpload={handleFileUpload}
                onImageUpload={handleImageUpload}
                isUploading={isUploading}
              />
            )}
            <MessageControls
              message={message}
              onMessageChange={(e) => setMessage(e.target.value)}
              onSend={handleSend}
              onWebSearch={handleWebSearch}
              onKeyPress={handleKeyPress}
              hasWebSearcher={hasWebSearcher}
              isSending={isSending}
              isSearching={isSearching}
              disabled={disabled}
            />
          </div>
        </div>
      </div>
    </div>
  );
}