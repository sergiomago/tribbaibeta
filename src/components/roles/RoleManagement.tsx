import { Button } from "@/components/ui/button";
import { RoleList } from "./RoleList";
import { CreateRoleButton } from "./CreateRoleButton";
import { Tables } from "@/integrations/supabase/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useSubscription } from "@/contexts/SubscriptionContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

interface RoleManagementProps {
  roles?: Tables<"roles">[];
  isLoading: boolean;
  onDelete: (id: string) => Promise<void>;
  onStartChat: (id: string) => void;
  onEdit: (id: string) => void;
  roleCount?: number;
  planType: string | null;
}

export function RoleManagement({
  roles,
  isLoading,
  onDelete,
  onStartChat,
  onEdit,
  roleCount = 0,
  planType,
}: RoleManagementProps) {
  const navigate = useNavigate();
  const { hasSubscription } = useSubscription();
  const maxRoles = planType === 'creator' ? 7 : 3; // 7 for creator plan, 3 for free tier
  const isAtLimit = roleCount >= maxRoles;
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const handleUpgradeClick = () => {
    navigate('/settings');
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        {isAtLimit ? (
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="default">
                Create Role
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upgrade to Create More Roles</DialogTitle>
                <DialogDescription>
                  {hasSubscription 
                    ? "Upgrade to Maestro plan for unlimited roles"
                    : `You've reached the limit of ${maxRoles} roles on your current plan. Upgrade to create more roles.`
                  }
                </DialogDescription>
              </DialogHeader>
              <Button onClick={handleUpgradeClick} className="w-full">
                View Plans
              </Button>
            </DialogContent>
          </Dialog>
        ) : (
          <CreateRoleButton 
            isDisabled={false}
            planType={planType}
            roleCount={roleCount}
          />
        )}
      </div>

      <RoleList
        roles={roles}
        isLoading={isLoading}
        onDelete={onDelete}
        onStartChat={onStartChat}
        onEdit={onEdit}
        viewMode={viewMode}
      />
    </div>
  );
}