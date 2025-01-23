import { useState, useRef, useCallback } from "react";
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
import { TagSuggestions } from "./TagSuggestions";
import { Role } from "@/types/role";
import { useQuery } from "@tanstack/react-query";

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
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState<{ top: number; left: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Fetch thread roles
  const { data: threadRoles } = useQuery({
    queryKey: ["thread-roles", threadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("thread_roles")
        .select(`
          role:roles (*)
        `)
        .eq("thread_id", threadId);
      if (error) throw error;
      return data.map(tr => tr.role) as Role[];
    },
    enabled: !!threadId,
  });

  const handleSend = async () => {
    setIsSending(true);
    try {
      const orchestrator = createRoleOrchestrator(threadId);
      
      // Extract tagged role including the @ symbol
      const tagMatch = message.match(/@\w+/);
      const taggedRole = tagMatch ? tagMatch[0] : null;
      
      await orchestrator.handleMessage(message, taggedRole);

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

  const handleFileUpload = async (file: File) => {
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
        title: "File uploaded",
        description: "Your file has been uploaded successfully.",
      });
      
      onMessageSent?.();
    } catch (error) {
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (showSuggestions) {
      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : (threadRoles?.length || 1) - 1
          );
          return;
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < (threadRoles?.length || 1) - 1 ? prev + 1 : 0
          );
          return;
        case "Enter":
          e.preventDefault();
          if (threadRoles?.[selectedIndex]) {
            handleRoleSelect(threadRoles[selectedIndex]);
          }
          return;
        case "Escape":
          e.preventDefault();
          setShowSuggestions(false);
          return;
      }
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setMessage(newValue);

    // Check for @ symbol
    const lastAtIndex = newValue.lastIndexOf('@');
    if (lastAtIndex !== -1 && lastAtIndex === newValue.length - 1) {
      const rect = e.target.getBoundingClientRect();
      const position = {
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX + (e.target.selectionStart || 0) * 8, // Approximate char width
      };
      setCursorPosition(position);
      setShowSuggestions(true);
      setSelectedIndex(0);
    } else if (!newValue.includes('@')) {
      setShowSuggestions(false);
    }
  };

  const handleRoleSelect = (role: Role) => {
    const lastAtIndex = message.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const newMessage = message.slice(0, lastAtIndex) + `@${role.tag} `;
      setMessage(newMessage);
    }
    setShowSuggestions(false);
  };

  const fileHandler = FileHandler({ onFileUpload: handleFileUpload });

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
            <div className="flex gap-2 relative">
              <FileUploadButtons
                threadId={threadId}
                onFileUpload={(e) => fileHandler.handleFileUpload(e, 'document')}
                onImageUpload={(e) => fileHandler.handleFileUpload(e, 'image')}
                isUploading={isUploading}
              />
              <Input
                ref={inputRef}
                placeholder={disabled ? "Message limit reached" : "Type your message..."}
                className="flex-1 text-base sm:text-sm"
                value={message}
                onChange={handleInputChange}
                onKeyDown={handleKeyPress}
                disabled={isSending || disabled}
              />
              <Button 
                onClick={handleSend} 
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
              <TagSuggestions
                roles={threadRoles || []}
                visible={showSuggestions}
                selectedIndex={selectedIndex}
                onSelect={handleRoleSelect}
                onKeyDown={handleKeyPress}
                cursorPosition={cursorPosition}
                inputRef={inputRef}
              />
            </div>
          </MessageValidation>
        </div>
      </div>
    </div>
  );
}