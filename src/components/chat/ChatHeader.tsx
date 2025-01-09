import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Edit2 } from "lucide-react";

interface ChatHeaderProps {
  title: string;
  onTitleChange: (newTitle: string) => void;
}

export function ChatHeader({ title, onTitleChange }: ChatHeaderProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [chatTitle, setChatTitle] = useState(title);

  const handleTitleChange = () => {
    onTitleChange(chatTitle);
    setIsEditingTitle(false);
  };

  return (
    <div className="border-b p-4">
      <div className="flex items-center justify-between">
        {isEditingTitle ? (
          <Input
            value={chatTitle}
            onChange={(e) => setChatTitle(e.target.value)}
            onBlur={handleTitleChange}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleTitleChange();
              }
            }}
            className="max-w-[300px]"
            autoFocus
          />
        ) : (
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">{chatTitle}</h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsEditingTitle(true)}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}