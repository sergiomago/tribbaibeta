import { Button } from "@/components/ui/button";
import { useRoleMindMigration } from "@/hooks/useRoleMindMigration";
import { Loader2 } from "lucide-react";

export function RoleMindMigration() {
  const { unmappedRoles, isLoading, createMinds, isCreating } = useRoleMindMigration();

  if (isLoading) {
    return <div className="flex items-center gap-2">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span>Checking roles...</span>
    </div>;
  }

  if (!unmappedRoles?.length) {
    return null;
  }

  return (
    <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
      <div className="flex-1">
        <p className="text-sm text-muted-foreground">
          {unmappedRoles.length} role{unmappedRoles.length !== 1 ? 's' : ''} need{unmappedRoles.length === 1 ? 's' : ''} to be migrated to the new mind system
        </p>
      </div>
      <Button 
        onClick={() => createMinds()}
        disabled={isCreating}
      >
        {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Migrate Roles
      </Button>
    </div>
  );
}