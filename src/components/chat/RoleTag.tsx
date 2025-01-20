import { Role } from "@/types/role";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRoleMetrics } from "@/hooks/useRoleMetrics";

export interface RoleTagProps {
  role: Role;
  onRemove?: () => void;
  className?: string;
  threadId?: string;
}

export function RoleTag({ role, onRemove, className, threadId }: RoleTagProps) {
  const { data: metrics } = useRoleMetrics(role.id, threadId || '');
  
  return (
    <Badge 
      variant="secondary" 
      className={cn(
        "flex items-center gap-1 pr-1 hover:bg-secondary/80", 
        className
      )}
    >
      <span className="truncate">
        {role.alias || role.name}
        {metrics?.effectiveness > 0.7 && " ⭐"}
      </span>
      {onRemove && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove();
          }}
          className="ml-1 rounded-full hover:bg-secondary-foreground/10"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </Badge>
  );
}