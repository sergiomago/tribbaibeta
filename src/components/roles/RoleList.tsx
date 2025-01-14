import { UserRoleCard } from "./UserRoleCard";
import { UserRoleListItem } from "./UserRoleListItem";
import { Role } from "@/types";

interface RoleListProps {
  roles: Role[];
  isGridView?: boolean;
  onDelete?: (roleId: string) => void;
  onStartChat?: (roleId: string) => void;
  onEdit?: (roleId: string) => void;
}

export function RoleList({ roles, isGridView = true, onDelete, onStartChat, onEdit }: RoleListProps) {
  if (isGridView) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
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
  }

  return (
    <div className="space-y-2 p-4">
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