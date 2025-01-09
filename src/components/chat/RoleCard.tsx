import { Button } from "@/components/ui/button";
import { Tag, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface RoleCardProps {
  name: string;
  tag: string;
  active?: boolean;
  onDelete?: () => void;
}

export function RoleCard({ name, tag, active, onDelete }: RoleCardProps) {
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
      {onDelete && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={onDelete}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}