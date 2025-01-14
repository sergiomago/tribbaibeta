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
import { LayoutGrid, List } from "lucide-react";

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
  const maxRoles = planType === 'creator' ? 7 : 3;
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
        <div className="flex gap-2">
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
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setViewMode('grid')}
            className={viewMode === 'grid' ? 'bg-primary/10' : ''}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setViewMode('list')}
            className={viewMode === 'list' ? 'bg-primary/10' : ''}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
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