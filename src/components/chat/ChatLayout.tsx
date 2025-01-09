import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, Plus, Search, Tag, UserRound } from "lucide-react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { cn } from "@/lib/utils";

export function ChatLayout() {
  const [chatSidebarSize, setChatSidebarSize] = useState(25);

  return (
    <ResizablePanelGroup direction="horizontal" className="h-[calc(100vh-2rem)]">
      {/* Chat List Sidebar */}
      <ResizablePanel
        defaultSize={chatSidebarSize}
        onResize={(size) => setChatSidebarSize(size)}
        className="min-w-[280px]"
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
          </div>
        </div>
      </ResizablePanel>

      <ResizableHandle />

      {/* Main Chat Area with Role Cards */}
      <ResizablePanel defaultSize={100 - chatSidebarSize}>
        <div className="flex h-full flex-col">
          <div className="border-b p-4">
            <h3 className="text-lg font-semibold">Project Discussion</h3>
            <p className="text-sm text-muted-foreground">3 roles active</p>
          </div>
          
          {/* Role Cards Section */}
          <div className="border-b bg-muted/30 p-4">
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
              <RoleCard
                name="Technical Advisor"
                tag="tech"
                active={true}
              />
              <RoleCard
                name="Product Manager"
                tag="product"
                active={true}
              />
              <RoleCard
                name="UX Designer"
                tag="design"
              />
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-auto p-4">
            {/* Chat messages will go here */}
          </div>

          {/* Message Input */}
          <div className="border-t p-4">
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
      className={cn(
        "w-full rounded-lg p-3 text-left transition-colors hover:bg-accent",
        active && "bg-accent"
      )}
    >
      <div className="flex items-center gap-3">
        {type === "team" ? (
          <UserRound className="h-5 w-5 text-primary" />
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

interface RoleCardProps {
  name: string;
  tag: string;
  active?: boolean;
}

function RoleCard({ name, tag, active }: RoleCardProps) {
  return (
    <div className={cn(
      "group relative rounded-lg border bg-card p-3 shadow-sm transition-all hover:shadow-md",
      active && "ring-2 ring-primary ring-offset-2"
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <h4 className="font-medium line-clamp-1">{name}</h4>
          <div className="mt-1 flex items-center gap-1">
            <Tag className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">@{tag}</span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}