import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Edit2,
  MessageSquare,
  Plus,
  Search,
  Tag,
  Trash2,
  UserRound,
} from "lucide-react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { cn } from "@/lib/utils";

export function ChatLayout() {
  const [chatSidebarSize, setChatSidebarSize] = useState(25);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [chatTitle, setChatTitle] = useState("Project Discussion");

  return (
    <ResizablePanelGroup
      direction="horizontal"
      className="h-[calc(100vh-4rem)]"
    >
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

      {/* Main Chat Area */}
      <ResizablePanel defaultSize={100 - chatSidebarSize}>
        <div className="flex h-full flex-col">
          {/* Chat Header with Title */}
          <div className="border-b p-4">
            <div className="flex items-center justify-between">
              {isEditingTitle ? (
                <Input
                  value={chatTitle}
                  onChange={(e) => setChatTitle(e.target.value)}
                  onBlur={() => setIsEditingTitle(false)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setIsEditingTitle(false);
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

          {/* Role Cards Section */}
          <div className="border-b bg-muted/30 p-4">
            <div className="flex flex-wrap gap-2">
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
              <Button
                variant="outline"
                size="sm"
                className="flex h-9 items-center gap-1"
              >
                <Plus className="h-3 w-3" />
                Add Role
              </Button>
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
    <div
      className={cn(
        "group relative flex h-9 items-center gap-2 rounded-lg border bg-card px-3 shadow-sm transition-all hover:shadow-md",
        active && "ring-2 ring-primary ring-offset-2"
      )}
    >
      <div className="flex items-center gap-1">
        <Tag className="h-3 w-3 text-muted-foreground" />
        <span className="text-sm">@{tag}</span>
      </div>
      <span className="text-sm font-medium">{name}</span>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
}