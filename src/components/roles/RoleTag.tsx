import { X } from "lucide-react";

interface RoleTagProps {
  role: {
    id: string;
    name: string;
    tag: string;
  };
  onRemove: (roleId: string) => void;
}

export const RoleTag = ({ role, onRemove }: RoleTagProps) => {
  return (
    <div className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm">
      <span className="font-medium text-primary">{role.name}</span>
      <span className="text-xs text-gray-500">@{role.tag}</span>
      <button
        className="ml-1 rounded-full hover:bg-primary/20 p-1"
        onClick={() => onRemove(role.id)}
        aria-label={`Remove ${role.name}`}
      >
        <X className="h-3 w-3 text-primary" />
      </button>
    </div>
  );
};
