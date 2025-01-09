import { Button } from "@/components/ui/button";
import { Tables } from "@/integrations/supabase/types";
import { Edit, MessageCircle } from "lucide-react";

type RoleCardProps = {
  role: Tables<"roles">;
};

export const RoleCard = ({ role }: RoleCardProps) => {
  return (
    <div className="group rounded-lg border bg-white/50 p-6 transition-all hover:bg-white hover:shadow-md dark:bg-gray-800/50 dark:hover:bg-gray-800">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">{role.name}</h3>
          {role.alias && (
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Alias: {role.alias}
            </p>
          )}
        </div>
        <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
          {role.tag}
        </span>
      </div>
      
      {role.description && (
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {role.description}
        </p>
      )}
      
      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Model: {role.model}
        </span>
        <div className="flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
          <Button variant="outline" size="sm">
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button variant="default" size="sm">
            <MessageCircle className="mr-2 h-4 w-4" />
            Chat
          </Button>
        </div>
      </div>
    </div>
  );
};