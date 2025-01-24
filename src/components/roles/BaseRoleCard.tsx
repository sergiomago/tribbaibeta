import { Tables } from "@/integrations/supabase/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Info, Loader2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type BaseRoleCardProps = {
  role: Tables<"roles">;
  children?: React.ReactNode;
};

export const BaseRoleCard = ({ role, children }: BaseRoleCardProps) => {
  const { data: mindStatus, isLoading } = useQuery({
    queryKey: ["role-mind", role.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("role_minds")
        .select("status, metadata")
        .eq("role_id", role.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
  });

  const getMindStatusBadge = () => {
    if (isLoading) {
      return (
        <Badge variant="outline" className="gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Loading
        </Badge>
      );
    }

    if (!mindStatus) {
      return (
        <Badge variant="outline" className="gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Initializing
        </Badge>
      );
    }

    switch (mindStatus.status) {
      case "pending":
        return (
          <Badge variant="outline" className="gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Creating mind
          </Badge>
        );
      case "active":
        return (
          <Badge variant="outline" className="text-green-600 dark:text-green-400">
            Mind active
          </Badge>
        );
      case "error":
        return (
          <Badge variant="outline" className="text-destructive gap-1">
            Mind error
          </Badge>
        );
      default:
        return null;
    }
  };

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
          <div className="flex items-center gap-2">
            {getMindStatusBadge()}
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