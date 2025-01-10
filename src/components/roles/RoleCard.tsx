import { Button } from "@/components/ui/button";
import { Tables } from "@/integrations/supabase/types";
import { Edit, MessageCircle, Trash } from "lucide-react";

type RoleCardProps = {
  role: Tables<"roles">;
  onEdit?: (role: Tables<"roles">) => void;
  onDelete?: (role: Tables<"roles">) => void;
};

export const RoleCard = ({ role, onEdit, onDelete }: RoleCardProps) => {
  return (
    <div className="group relative rounded-lg border bg-white/50 p-4 transition-all hover:bg-white hover:shadow-lg dark:bg-gray-800/50 dark:hover:bg-gray-800">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {role.name}
          </h3>
          {role.alias && (
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              @{role.alias}
            </p>
          )}
        </div>
        <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
          {role.tag}
        </span>
      </div>

      {role.description && (
        <p className="mt-2 text-sm text-gray-600 line-clamp-2 dark:text-gray-400">
          {role.description}
        </p>
      )}

      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {role.model}
        </span>
        <div className="flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit?.(role)}
          >
            <Edit className="mr-2 h-3 w-3" />
            Edit
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onDelete?.(role)}
          >
            <Trash className="mr-2 h-3 w-3" />
            Delete
          </Button>
          <Button variant="default" size="sm">
            <MessageCircle className="mr-2 h-3 w-3" />
            Chat
          </Button>
        </div>
      </div>
    </div>
  );
};