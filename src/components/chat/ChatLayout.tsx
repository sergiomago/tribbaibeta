import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChatHeader } from "./ChatHeader";
import { RoleSection } from "./RoleSection";

export function ChatLayout() {
  const [chatTitle, setChatTitle] = useState("Project Discussion");
  const [roles, setRoles] = useState([
    {
      name: "Technical Advisor",
      tag: "tech",
      active: true,
    },
    {
      name: "Product Manager",
      tag: "product",
      active: true,
    },
    {
      name: "UX Designer",
      tag: "design",
    },
  ]);

  const handleAddRole = () => {
    // TODO: Implement role selection dialog
    console.log("Add role clicked");
  };

  const handleRemoveRole = (tag: string) => {
    setRoles(roles.filter((role) => role.tag !== tag));
  };

  return (
    <div className="flex h-full flex-col">
      <ChatHeader title={chatTitle} onTitleChange={setChatTitle} />
      <RoleSection
        roles={roles}
        onAddRole={handleAddRole}
        onRemoveRole={handleRemoveRole}
      />

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
  );
}
