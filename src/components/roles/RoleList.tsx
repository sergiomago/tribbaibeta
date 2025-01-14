import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { UserRoleCard } from "./UserRoleCard";
import { UserRoleListItem } from "./UserRoleListItem";
import { Skeleton } from "@/components/ui/skeleton";

interface RoleListProps {
  viewMode: "grid" | "list";
}

export function RoleList({ viewMode }: RoleListProps) {
  const { data: roles, isLoading } = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roles")
        .select("*")
        .eq("is_template", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className={viewMode === "grid" 
        ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        : "flex flex-col gap-2"
      }>
        {[...Array(3)].map((_, i) => (
          viewMode === "grid" ? (
            <Skeleton key={i} className="h-[200px] rounded-lg" />
          ) : (
            <Skeleton key={i} className="h-16 rounded-lg" />
          )
        ))}
      </div>
    );
  }

  if (!roles?.length) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No roles created yet. Create your first role to get started!</p>
      </div>
    );
  }

  return (
    <div className={viewMode === "grid"
      ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      : "flex flex-col gap-2"
    }>
      {roles.map((role) => (
        viewMode === "grid" ? (
          <UserRoleCard key={role.id} role={role} />
        ) : (
          <UserRoleListItem key={role.id} role={role} />
        )
      ))}
    </div>
  );
}