import { Tables } from "@/integrations/supabase/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type BaseRoleCardProps = {
  role: Tables<"roles">;
  children?: React.ReactNode;
};

export const BaseRoleCard = ({ role, children }: BaseRoleCardProps) => {
  return (
    <Card className="relative group p-6 h-[280px] flex flex-col bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm border-gray-200 dark:border-gray-800 hover:border-primary/50 dark:hover:border-primary/50 transition-colors">
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-lg">{role.name}</h3>
            {role.alias && (
              <p className="text-sm text-muted-foreground">{role.alias}</p>
            )}
          </div>
          <Tooltip>
            <TooltipTrigger>
              <Badge variant="outline" className="ml-2">
                <Info className="h-3 w-3 mr-1" />
                {role.tag}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">Tag used to mention this role in chat</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="prose prose-sm dark:prose-invert max-w-none">
          <p className="line-clamp-4 text-sm text-muted-foreground">
            {role.description || "No description provided."}
          </p>
        </div>
      </div>

      {children}
    </Card>
  );
};