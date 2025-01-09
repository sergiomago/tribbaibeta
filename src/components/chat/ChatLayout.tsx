import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, Plus, Search, Users } from "lucide-react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanel as ResizablePanelPrimitive,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

export function ChatLayout() {
  const [chatSidebarSize, setChatSidebarSize] = useState(20);
  const [rolePanelSize, setRolePanelSize] = useState(25);

  return (
    <ResizablePanelGroup direction="horizontal" className="h-[calc(100vh-2rem)]">
      {/* Chat List Sidebar */}
      <ResizablePanel
        defaultSize={chatSidebarSize}
        onResize={(size) => setChatSidebarSize(size)}
        className="min-w-[250px]"
      >
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
              type="team"
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
            {/* Add more chat items here */}
          </div>
        </div>
      </ResizablePanel>

      <ResizableHandle />

      {/* Main Chat Area */}
      <ResizablePanel defaultSize={100 - chatSidebarSize - rolePanelSize}>
        <div className="flex h-full flex-col">
          <div className="border-b p-4">
            <h3 className="text-lg font-semibold">Project Discussion</h3>
            <p className="text-sm text-muted-foreground">3 roles active</p>
          </div>
          <div className="flex-1 overflow-auto p-4">
            {/* Chat messages will go here */}
          </div>
          <div className="border-t p-4">
            <div className="flex gap-2">
              <Input placeholder="Type your message..." className="flex-1" />
              <Button>Send</Button>
            </div>
          </div>
        </div>
      </ResizablePanel>

      <ResizableHandle />

      {/* Role Management Panel */}
      <ResizablePanel
        defaultSize={rolePanelSize}
        onResize={(size) => setRolePanelSize(size)}
        className="min-w-[250px]"
      >
        <div className="flex h-full flex-col gap-4 border-l p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Roles</h2>
            <Button variant="ghost" size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 space-y-2">
            {/* Role list will go here */}
          </div>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}

interface ChatListItemProps {
  title: string;
  type: "team" | "individual";
  lastMessage?: string;
  timestamp?: string;
  active?: boolean;
}

function ChatListItem({
  title,
  type,
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
        {type === "team" ? (
          <Users className="h-5 w-5 text-primary" />
        ) : (
          <MessageSquare className="h-5 w-5 text-primary" />
        )}
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