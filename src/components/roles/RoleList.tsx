import { Tables } from "@/integrations/supabase/types";
import { Loader2 } from "lucide-react";
import { UserRoleCard } from "./UserRoleCard";
import { UserRoleListItem } from "./UserRoleListItem";

type RoleListProps = {
  roles: Tables<"roles">[] | undefined;
  isLoading: boolean;
  onDelete: (id: string) => Promise<void>;
  onStartChat: (id: string) => void;
  onEdit: (id: string) => void;
  viewMode: 'grid' | 'list';
};

export const RoleList = ({ roles, isLoading, onDelete, onStartChat, onEdit, viewMode }: RoleListProps) => {
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!roles?.length) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-gray-600 dark:text-gray-400">
          No roles created yet. Create your first role using the button above.
        </p>
      </div>
    );
  }

  if (viewMode === 'list') {
    return (
      <div className="space-y-2">
        {roles.map((role) => (
          <UserRoleListItem
            key={role.id} 
            role={role} 
            onDelete={onDelete}
            onStartChat={onStartChat}
            onEdit={onEdit}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {roles.map((role) => (
        <UserRoleCard
          key={role.id} 
          role={role} 
          onDelete={onDelete}
          onStartChat={onStartChat}
          onEdit={onEdit}
        />
      ))}
    </div>
  );
};