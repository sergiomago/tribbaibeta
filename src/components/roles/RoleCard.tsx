import { Button } from "@/components/ui/button";
import { Tables } from "@/integrations/supabase/types";

type RoleCardProps = {
  role: Tables<"roles">;
};

export const RoleCard = ({ role }: RoleCardProps) => {
  return (
    <div className="rounded-lg border p-4 hover:bg-accent transition-colors">
      <h3 className="font-semibold">{role.name}</h3>
      {role.alias && (
        <p className="text-sm text-muted-foreground">
          Alias: {role.alias}
        </p>
      )}
      <span className="inline-block px-2 py-1 text-xs bg-primary/10 text-primary rounded-full mt-2">
        {role.tag}
      </span>
      {role.description && (
        <p className="mt-2 text-sm text-muted-foreground">
          {role.description}
        </p>
      )}
      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          Model: {role.model}
        </span>
        <Button variant="outline" size="sm">
          Edit
        </Button>
      </div>
    </div>
  );
};