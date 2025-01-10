import { Tables } from "@/integrations/supabase/types";
import { Loader2 } from "lucide-react";
import { RoleCard } from "./RoleCard";

type RoleListProps = {
  roles: Tables<"roles">[] | undefined;
  isLoading: boolean;
  onDelete: (id: string) => void;
  onStartChat: (id: string) => void;
};

export const RoleList = ({ roles, isLoading, onDelete, onStartChat }: RoleListProps) => {
  if (isLoading) {
    return (
      <div className="flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!roles?.length) {
    return (
      <p className="text-center text-muted-foreground">
        No roles created yet. Create your first role using the form.
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {roles.map((role) => (
        <RoleCard 
          key={role.id} 
          role={role} 
          onDelete={onDelete}
          onStartChat={onStartChat}
        />
      ))}
    </div>
  );
};