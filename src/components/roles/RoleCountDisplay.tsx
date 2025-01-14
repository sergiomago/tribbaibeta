import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

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

  if (!roleCount) return null;

  // Different limits based on plan
  const maxRoles = planType === 'creator' ? 7 : 3;
  const isAtLimit = roleCount >= maxRoles;
  const percentage = (roleCount / maxRoles) * 100;

  if (!isAtLimit) {
    return (
      <div className="mb-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Available Roles</span>
          <span className="font-medium">{roleCount}/{maxRoles}</span>
        </div>
        <Progress value={percentage} className="h-2" />
      </div>
    );
  }

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        {planType === 'creator' ? (
          <>
            You've reached the maximum of 7 roles on the Creator plan.{' '}
            <a href="/settings" className="font-medium underline underline-offset-4">
              Upgrade to Maestro
            </a>{' '}
            for unlimited roles.
          </>
        ) : (
          <>
            You've reached the free tier limit of 3 roles.{' '}
            <a href="/settings" className="font-medium underline underline-offset-4">
              Upgrade to Creator
            </a>{' '}
            for up to 7 roles, or{' '}
            <a href="/settings" className="font-medium underline underline-offset-4">
              Maestro
            </a>{' '}
            for unlimited roles.
          </>
        )}
      </AlertDescription>
    </Alert>
  );
}