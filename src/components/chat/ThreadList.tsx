import { ThreadListItem } from "./ThreadListItem";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ThreadListProps {
  selectedThreadId: string | null;
  editingThreadId: string | null;
  newThreadName: string;
  onThreadSelect: (threadId: string) => void;
  onEditStart: (thread: any) => void;
  onEditSubmit: (threadId: string) => void;
  onNameChange: (name: string) => void;
  onDeleteClick: (threadId: string) => void;
  isCollapsed?: boolean;
}

export function ThreadList({
  selectedThreadId,
  editingThreadId,
  newThreadName,
  onThreadSelect,
  onEditStart,
  onEditSubmit,
  onNameChange,
  onDeleteClick,
  isCollapsed = false,
}: ThreadListProps) {
  const { data: threads } = useQuery({
    queryKey: ["threads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("threads")
        .select("*")
        .order("created_at", { ascending: false }); // Changed to descending order
      if (error) throw error;
      return data;
    },
  });

  return (
    <ScrollArea className="h-full">
      <div className="p-2 space-y-2">
        {threads?.map((thread) => (
          <ThreadListItem
            key={thread.id}
            thread={thread}
            isSelected={selectedThreadId === thread.id}
            isEditing={editingThreadId === thread.id}
            newName={newThreadName}
            onSelect={onThreadSelect}
            onEditStart={onEditStart}
            onEditSubmit={onEditSubmit}
            onNameChange={onNameChange}
            onDeleteClick={onDeleteClick}
            isCollapsed={isCollapsed}
          />
        ))}
      </div>
    </ScrollArea>
  );
}