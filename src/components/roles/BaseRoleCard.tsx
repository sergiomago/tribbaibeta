import { Tables } from "@/integrations/supabase/types";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

type BaseRoleCardProps = {
  role: Tables<"roles">;
  children?: React.ReactNode;
};

export const BaseRoleCard = ({ role, children }: BaseRoleCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="group relative rounded-xl border border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm p-6 transition-all hover:bg-white/70 dark:hover:bg-gray-800/70 shadow-sm hover:shadow-md">
      <div className="flex flex-col h-full">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              {role.name}
            </h3>
            {role.alias && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {role.alias}
              </p>
            )}
          </div>
          <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
            {role.tag}
          </span>
        </div>

        {role.description && (
          <div className="mb-4">
            <p className={`text-sm text-gray-600 dark:text-gray-300 ${!isExpanded ? 'line-clamp-2' : ''}`}>
              {role.description}
            </p>
            {role.description.length > 100 && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-1 h-auto p-0 text-xs text-primary hover:bg-transparent hover:text-primary/80"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? (
                  <ChevronUp className="h-3 w-3 mr-1" />
                ) : (
                  <ChevronDown className="h-3 w-3 mr-1" />
                )}
                {isExpanded ? 'Show less' : 'Show more'}
              </Button>
            )}
          </div>
        )}

        {children}
      </div>
    </div>
  );
};