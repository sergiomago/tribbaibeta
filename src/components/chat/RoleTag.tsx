import { X } from "lucide-react";

interface RoleTagProps {
  role: {
    id: string;
    name: string;
    tag: string;
  };
  onRemove: () => void;
}

export function RoleTag({ role, onRemove }: RoleTagProps) {
  return (
    <div className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-sm animate-fade-in">
      <div className="flex items-center gap-1.5">
        <span className="font-semibold text-primary">{role.name}</span>
        <span className="text-xs text-muted-foreground">@{role.tag}</span>
      </div>
      <button
        className="ml-1 rounded-full hover:bg-primary/20 p-1 transition-colors"
        onClick={onRemove}
        aria-label="Remove role"
      >
        <X className="h-3 w-3 text-primary" />
      </button>
    </div>
  );
}