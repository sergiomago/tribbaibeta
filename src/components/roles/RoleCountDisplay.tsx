import { Role } from "@/types";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface RoleCountDisplayProps {
  roles: Role[];
}

export function RoleCountDisplay({ roles }: RoleCountDisplayProps) {
  const { planType } = useSubscription();
  
  const roleCount = roles?.length || 0;

  // Different limits based on plan
  const maxRoles = planType === 'creator' ? 7 : planType === 'maestro' ? Infinity : 3;
  const isAtLimit = roleCount >= maxRoles;
  const percentage = maxRoles === Infinity ? 0 : (roleCount / maxRoles) * 100;

  if (!isAtLimit) {
    return (
      <div className="flex items-center gap-4">
        <Progress value={percentage} className="w-32 h-2" />
        <Badge variant="outline" className="h-6">
          {roleCount}/{maxRoles === Infinity ? '∞' : maxRoles} roles
        </Badge>
      </div>
    );
  }

  if (planType === 'maestro') {
    return null;
  }

  return (
    <Alert variant="destructive" className="max-w-fit py-2 px-4 flex items-center gap-2">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription className="text-sm">
        {planType === 'creator' ? (
          <span>
            Upgrade to <a href="/settings" className="font-medium underline underline-offset-4">Maestro</a> for unlimited roles
          </span>
        ) : (
          <span>
            Upgrade to <a href="/settings" className="font-medium underline underline-offset-4">Creator</a> for more roles
          </span>
        )}
      </AlertDescription>
    </Alert>
  );
}