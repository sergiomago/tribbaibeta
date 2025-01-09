import { Tables } from "@/integrations/supabase/types";
import { Loader2 } from "lucide-react";
import { RoleCard } from "./RoleCard";

type RoleListProps = {
  roles: Tables<"roles">[] | undefined;
  isLoading: boolean;
};

export const RoleList = ({ roles, isLoading }: RoleListProps) => {
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
    <div className="grid gap-4">
      {roles.map((role) => (
        <RoleCard key={role.id} role={role} />
      ))}
    </div>
  );
};