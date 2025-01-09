import { Search, Plus, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ChatSidebarProps {
  defaultSize: number;
  onResize: (size: number) => void;
}

interface ChatListItemProps {
  title: string;
  type: "individual";
  lastMessage?: string;
  timestamp?: string;
  active?: boolean;
}

export function ChatSidebar({ defaultSize, onResize }: ChatSidebarProps) {
  return (
    <div className="flex h-full flex-col gap-4 border-r p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Chats</h2>
        <Button variant="ghost" size="icon">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search chats..." />
      </div>
      <div className="flex-1 space-y-2">
        <ChatListItem
          title="Project Discussion"
          type="individual"
          active={true}
          lastMessage="Let's analyze the requirements..."
          timestamp="2m ago"
        />
        <ChatListItem
          title="Code Review"
          type="individual"
          lastMessage="The implementation looks good..."
          timestamp="1h ago"
        />
      </div>
    </div>
  );
}

function ChatListItem({
  title,
  lastMessage,
  timestamp,
  active,
}: ChatListItemProps) {
  return (
    <button
      className={`w-full rounded-lg p-3 text-left transition-colors hover:bg-accent ${
        active ? "bg-accent" : ""
      }`}
    >
      <div className="flex items-center gap-3">
        <MessageSquare className="h-5 w-5 text-primary" />
        <div className="flex-1 overflow-hidden">
          <h4 className="font-medium">{title}</h4>
          {lastMessage && (
            <p className="truncate text-sm text-muted-foreground">
              {lastMessage}
            </p>
          )}
        </div>
        {timestamp && (
          <span className="text-xs text-muted-foreground">{timestamp}</span>
        )}
      </div>
    </button>
  );
}