import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RoleList } from "./RoleList";
import { CreateRoleButton } from "./CreateRoleButton";
import { RoleCountDisplay } from "./RoleCountDisplay";
import { RolePackages } from "./RolePackages";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/utils";

export function RoleManagement() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const { hasSubscription, planType } = useSubscription();

  // Query free tier limits
  const { data: freeTierLimits } = useQuery({
    queryKey: ["free-tier-limits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("free_tier_limits")
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Query user's roles count
  const { data: roleCount } = useQuery({
    queryKey: ["role-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("roles")
        .select("*", { count: 'exact', head: true })
        .eq("is_template", false);
      if (error) throw error;
      return count || 0;
    },
  });

  const maxRoles = hasSubscription 
    ? (planType === 'creator' ? 7 : Infinity)
    : (freeTierLimits?.max_roles || 3);

  const isAtLimit = maxRoles !== Infinity && roleCount !== null && roleCount >= maxRoles;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold">Your Roles</h1>
            {!hasSubscription && (
              <p className="text-sm text-muted-foreground">
                Free tier: {roleCount}/{maxRoles} roles used
              </p>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center border rounded-lg p-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode("grid")}
                className={cn(
                  "px-2",
                  viewMode === "grid" && "bg-muted"
                )}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode("list")}
                className={cn(
                  "px-2",
                  viewMode === "list" && "bg-muted"
                )}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
            <CreateRoleButton disabled={isAtLimit} />
          </div>
        </div>

        {isAtLimit && !hasSubscription && (
          <div className="bg-primary/5 border border-primary/10 rounded-lg p-4">
            <h3 className="font-semibold mb-1">Upgrade to Create More Roles</h3>
            <p className="text-sm text-muted-foreground mb-4">
              You've reached the free tier limit of {maxRoles} roles. 
              Upgrade to our Creator plan for up to 7 roles, or Maestro plan for unlimited roles.
            </p>
            <RolePackages />
          </div>
        )}

        <RoleList viewMode={viewMode} />
      </div>
    </div>
  );
}