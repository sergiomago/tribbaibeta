import { useState } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ChatSidebar } from "./ChatSidebar";
import { RoleManagementBar } from "./RoleManagementBar";
import { ChatInput } from "./ChatInput";

export function ChatLayout() {
  const [chatSidebarSize, setChatSidebarSize] = useState(20);

  return (
    <ResizablePanelGroup 
      direction="horizontal" 
      className="min-h-[calc(100vh-4rem)]"
    >
      {/* Chat List Sidebar */}
      <ResizablePanel
        defaultSize={chatSidebarSize}
        onResize={(size) => setChatSidebarSize(size)}
        className="min-w-[250px]"
      >
        <ChatSidebar 
          defaultSize={chatSidebarSize} 
          onResize={setChatSidebarSize}
        />
      </ResizablePanel>

      <ResizableHandle />

      {/* Main Chat Area */}
      <ResizablePanel defaultSize={100 - chatSidebarSize}>
        <div className="flex flex-col h-[calc(100vh-4rem)]">
          <RoleManagementBar />
          
          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Chat messages will go here */}
          </div>
          
          <ChatInput />
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
