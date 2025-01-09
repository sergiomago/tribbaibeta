import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, Plus, Search, X } from "lucide-react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

export function ChatLayout() {
  const [chatSidebarSize, setChatSidebarSize] = useState(20);

  return (
    <ResizablePanelGroup 
      direction="horizontal" 
      className="min-h-[calc(100vh-4rem)]" // Changed to min-height
    >
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
      </ResizablePanel>

      <ResizableHandle />

      {/* Main Chat Area */}
      <ResizablePanel defaultSize={100 - chatSidebarSize}>
        <div className="flex flex-col h-[calc(100vh-4rem)]"> {/* Fixed height for main container */}
          {/* Role Management Bar */}
          <div className="border-b p-4 flex-shrink-0"> {/* Added flex-shrink-0 */}
            <div className="flex items-center justify-between mb-2">
              <Input
                className="text-lg font-semibold bg-transparent border-none hover:bg-gray-100 dark:hover:bg-gray-800 px-2 max-w-[300px]"
                defaultValue="Project Discussion"
                placeholder="Chat title..."
              />
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Role
              </Button>
            </div>
            <div className="flex gap-2 flex-wrap">
              <RoleTag name="Developer" tag="dev" />
              <RoleTag name="Product Manager" tag="pm" />
              <RoleTag name="Designer" tag="design" />
            </div>
          </div>
          
          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Chat messages will go here */}
          </div>
          
          {/* Input Container - Fixed at bottom */}
          <div className="border-t p-4 bg-background mt-auto">
            <div className="flex gap-2">
              <Input placeholder="Type your message..." className="flex-1" />
              <Button>Send</Button>
            </div>
          </div>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}

interface ChatListItemProps {
  title: string;
  type: "individual";
  lastMessage?: string;
  timestamp?: string;
  active?: boolean;
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

interface RoleTagProps {
  name: string;
  tag: string;
}

function RoleTag({ name, tag }: RoleTagProps) {
  return (
    <div className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm">
      <span className="font-medium text-primary">{name}</span>
      <span className="text-xs text-gray-500">@{tag}</span>
      <button className="ml-1 rounded-full hover:bg-primary/20 p-1">
        <X className="h-3 w-3 text-primary" />
      </button>
    </div>
  );
}