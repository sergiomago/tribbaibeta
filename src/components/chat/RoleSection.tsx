import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { RoleCard } from "./RoleCard";

interface Role {
  name: string;
  tag: string;
  active?: boolean;
}

interface RoleSectionProps {
  roles: Role[];
  onAddRole: () => void;
  onRemoveRole: (tag: string) => void;
}

export function RoleSection({ roles, onAddRole, onRemoveRole }: RoleSectionProps) {
  return (
    <div className="border-b bg-muted/30 p-4">
      <div className="flex flex-wrap gap-2">
        {roles.map((role) => (
          <RoleCard
            key={role.tag}
            name={role.name}
            tag={role.tag}
            active={role.active}
            onDelete={() => onRemoveRole(role.tag)}
          />
        ))}
        <Button
          variant="outline"
          size="sm"
          className="flex h-9 items-center gap-1"
          onClick={onAddRole}
        >
          <Plus className="h-3 w-3" />
          Add Role
        </Button>
      </div>
    </div>
  );
}