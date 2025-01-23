import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FileUploadButtons } from "./FileUploadButtons";
import { MessageValidation } from "./MessageValidation";
import { MessageCounter } from "./MessageCounter";
import { Role } from "@/types/role";
import { ChatInputCore } from "./input/ChatInputCore";
import { TagHandlerCore } from "./input/TagHandlerCore";
import { useMessageSender } from "./input/MessageSender";
import { useFileUploadHandler } from "./input/FileUploadHandler";
import { FileHandler } from "./FileHandler";

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

  const { sendMessage } = useMessageSender({ 
    threadId, 
    onMessageSent 
  });

  const { uploadFile } = useFileUploadHandler({
    threadId,
    onFileUploaded: onMessageSent
  });

  const handleSend = async () => {
    setIsSending(true);
    try {
      const tagMatch = message.match(/@(\w+)/);
      const taggedRole = tagMatch ? tagMatch[1] : null;
      await sendMessage(message, taggedRole);
      setMessage("");
    } finally {
      setIsSending(false);
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

    const lastAtIndex = newValue.lastIndexOf('@');
    if (lastAtIndex !== -1 && lastAtIndex === newValue.length - 1) {
      const rect = e.target.getBoundingClientRect();
      const position = {
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX + (e.target.selectionStart || 0) * 8,
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

  const fileHandler = FileHandler({ onFileUpload: uploadFile });

  return (
    <div className="border-t bg-background mt-auto">
      <MessageCounter messageCount={messageCount} maxMessages={maxMessages} />
      <div className="p-2 sm:p-4">
        <div className="flex flex-col gap-2 max-w-[95%] sm:max-w-4xl mx-auto">
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
              <ChatInputCore
                message={message}
                onMessageChange={handleInputChange}
                onSend={handleSend}
                onKeyPress={handleKeyPress}
                isSending={isSending}
                disabled={disabled}
              />
              <TagHandlerCore
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