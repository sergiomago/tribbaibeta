import { Tables } from "@/integrations/supabase/types";
import { RoleList } from "./RoleList";
import { RoleControls } from "./RoleControls";
import { CreateRoleButton } from "./CreateRoleButton";
import { useState } from "react";

type ViewMode = 'grid' | 'list';
type SortOption = 'role-asc' | 'role-desc' | 'date-new' | 'date-old';

type RoleManagementProps = {
  roles: Tables<"roles">[] | undefined;
  isLoading: boolean;
  onDelete: (id: string) => Promise<void>;
  onStartChat: (id: string) => void;
  onEdit: (id: string) => void;
  roleCount: number | undefined;
  planType: string | null;
};

export const RoleManagement = ({ 
  roles, 
  isLoading, 
  onDelete, 
  onStartChat, 
  onEdit,
  roleCount,
  planType
}: RoleManagementProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortOption, setSortOption] = useState<SortOption>('role-asc');

  const sortRoles = (rolesData: Tables<"roles">[]) => {
    if (!rolesData) return [];
    
    const sorted = [...rolesData];
    switch (sortOption) {
      case 'role-asc':
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case 'role-desc':
        return sorted.sort((a, b) => b.name.localeCompare(a.name));
      case 'date-new':
        return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      case 'date-old':
        return sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      default:
        return sorted;
    }
  };

  const isCreateDisabled = roleCount !== undefined && (
    (planType === 'creator' && roleCount >= 7) ||
    (!planType && roleCount >= 3)
  );

  return (
    <div className="mt-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold">Your Roles</h2>
        <div className="flex gap-2">
          <RoleControls
            sortOption={sortOption}
            viewMode={viewMode}
            onSortChange={setSortOption}
            onViewModeChange={setViewMode}
          />
          <CreateRoleButton
            isDisabled={isCreateDisabled}
            planType={planType}
            roleCount={roleCount}
          />
        </div>
      </div>
      <RoleList 
        roles={sortRoles(roles)}
        isLoading={isLoading}
        onDelete={onDelete}
        onStartChat={onStartChat}
        onEdit={onEdit}
        viewMode={viewMode}
      />
    </div>
  );
};