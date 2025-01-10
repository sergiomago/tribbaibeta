import { useState } from "react";
import { ChatSidebar } from "./ChatSidebar";
import { ChatInput } from "./ChatInput";
import { RoleManagementBar } from "./RoleManagementBar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function ChatLayout() {
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);

  const { data: threadRoles } = useQuery({
    queryKey: ["thread-roles", selectedThreadId],
    queryFn: async () => {
      if (!selectedThreadId) return [];
      const { data, error } = await supabase
        .from("thread_roles")
        .select(`
          role:roles (*)
        `)
        .eq("thread_id", selectedThreadId);
      if (error) throw error;
      return data.map(tr => tr.role);
    },
    enabled: !!selectedThreadId,
  });

  const hasRoles = !!threadRoles?.length;

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <div className="w-80">
        <ChatSidebar onThreadSelect={setSelectedThreadId} />
      </div>
      <div className="flex-1 flex flex-col">
        <RoleManagementBar threadId={selectedThreadId} />
        <div className="flex-1 overflow-y-auto p-4">
          {/* Messages will go here */}
        </div>
        {selectedThreadId && (
          <ChatInput 
            threadId={selectedThreadId} 
            hasRoles={hasRoles}
            onMessageSent={() => {
              // Handle message sent
            }} 
          />
        )}
      </div>
    </div>
  );
}