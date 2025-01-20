import { Badge } from "@/components/ui/badge";
import { useRoleMetrics } from "@/hooks/useRoleMetrics";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Brain } from "lucide-react";

interface RoleTagProps {
  roleId: string;
  threadId: string;
  name: string;
  tag?: string;
}

export function RoleTag({ roleId, threadId, name, tag }: RoleTagProps) {
  const { data: effectiveness } = useRoleMetrics(roleId, threadId);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="secondary"
            className="flex items-center gap-1 cursor-help"
          >
            {name}
            {effectiveness !== undefined && (
              <Brain className={`h-3 w-3 ${
                effectiveness > 0.7 ? 'text-green-500' :
                effectiveness > 0.4 ? 'text-yellow-500' :
                'text-red-500'
              }`} />
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>Role: {tag || name}</p>
          {effectiveness !== undefined && (
            <p>Effectiveness: {(effectiveness * 100).toFixed(0)}%</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}