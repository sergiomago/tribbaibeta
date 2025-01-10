import { format } from "date-fns";
import { MessageSquare, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ThreadListItemProps {
  thread: {
    id: string;
    name: string;
    last_opened?: string;
  };
  isSelected: boolean;
  isEditing: boolean;
  newName: string;
  onSelect: (threadId: string) => void;
  onEditStart: (thread: any) => void;
  onEditSubmit: (threadId: string) => void;
  onNameChange: (name: string) => void;
  onDeleteClick: (threadId: string) => void;
  isCollapsed?: boolean;
}

export function ThreadListItem({
  thread,
  isSelected,
  isEditing,
  newName,
  onSelect,
  onEditStart,
  onEditSubmit,
  onNameChange,
  onDeleteClick,
  isCollapsed = false,
}: ThreadListItemProps) {
  return (
    <div
      className={cn(
        "group rounded-lg transition-colors",
        isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted"
      )}
    >
      <div className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  onEditSubmit(thread.id);
                }}
                className={cn(isCollapsed && "hidden")}
              >
                <Input
                  value={newName}
                  onChange={(e) => onNameChange(e.target.value)}
                  onBlur={() => onEditSubmit(thread.id)}
                  autoFocus
                  className="h-7"
                />
              </form>
            ) : (
              <button
                onClick={() => onSelect(thread.id)}
                className="flex items-center gap-2 w-full text-left"
              >
                <MessageSquare className="h-4 w-4 shrink-0" />
                {!isCollapsed && (
                  <span className="font-medium truncate">{thread.name}</span>
                )}
              </button>
            )}
            {thread.last_opened && !isCollapsed && (
              <div className="text-xs text-muted-foreground mt-1">
                {format(new Date(thread.last_opened), "MMM d, yyyy")}
              </div>
            )}
          </div>
          {!isCollapsed && (
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onEditStart(thread)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive"
                onClick={() => onDeleteClick(thread.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}