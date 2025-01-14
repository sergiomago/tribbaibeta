import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function RoleCountDisplay() {
  const { planType } = useSubscription();
  
  const { data: roleCount } = useQuery({
    queryKey: ['role-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('roles')
        .select('*', { count: 'exact' })
        .eq('is_template', false);
      
      if (error) throw error;
      return count || 0;
    }
  });

  if (planType !== 'creator' || !roleCount) return null;

  const isNearLimit = roleCount >= 6;
  const isAtLimit = roleCount >= 7;

  if (!isNearLimit) return null;

  return (
    <Alert variant={isAtLimit ? "destructive" : "warning"} className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        {isAtLimit ? (
          <>
            You've reached the maximum of 7 roles on the Creator plan.{' '}
            <a href="/settings" className="font-medium underline underline-offset-4">
              Upgrade to Maestro
            </a>{' '}
            for unlimited roles.
          </>
        ) : (
          <>
            You're using {roleCount}/7 roles on the Creator plan.{' '}
            <a href="/settings" className="font-medium underline underline-offset-4">
              Upgrade to Maestro
            </a>{' '}
            for unlimited roles.
          </>
        )}
      </AlertDescription>
    </Alert>
  );
}