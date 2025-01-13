import { X } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

interface RoleTagProps {
  role: Tables<"roles">;
  onRemove: () => void;
  className?: string;
}

export function RoleTag({ role, onRemove, className }: RoleTagProps) {
  return (
    <div className={cn("flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm", className)}>
      <span className="font-medium text-primary">{role.name}</span>
      <span className="text-xs text-gray-500">{role.tag}</span>
      <button
        className="ml-1 rounded-full hover:bg-primary/20 p-1"
        onClick={onRemove}
      >
        <X className="h-3 w-3 text-primary" />
      </button>
    </div>
  );
}