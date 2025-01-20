import { useQuery } from "@tanstack/react-query";
import { getRoleEffectiveness } from "@/utils/roles/interaction/InteractionMetrics";

export function useRoleMetrics(roleId: string, threadId: string) {
  return useQuery({
    queryKey: ['roleMetrics', roleId, threadId],
    queryFn: () => getRoleEffectiveness(roleId, threadId),
    staleTime: 1000 * 60, // Refresh every minute
    enabled: !!roleId && !!threadId,
  });
}