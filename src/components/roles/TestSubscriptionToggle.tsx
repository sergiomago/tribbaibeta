import { useSubscription } from "@/contexts/SubscriptionContext";
import { Button } from "@/components/ui/button";
import { Crown, Star, User } from "lucide-react";

export function TestSubscriptionToggle() {
  const { checkSubscription } = useSubscription();

  const setTestSubscription = async (planType: string | null) => {
    // Temporarily override subscription data in localStorage
    if (planType === null) {
      localStorage.removeItem('test_subscription');
    } else {
      localStorage.setItem('test_subscription', JSON.stringify({
        planType,
        isActive: true,
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      }));
    }
    
    // Refresh subscription state
    await checkSubscription();
  };

  // Only show in development
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <div className="mb-8 p-4 border-2 border-yellow-400 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
      <div className="flex flex-col gap-4">
        <div className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
          🧪 Test Subscription Toggle (Development Only)
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => setTestSubscription(null)}
            className="gap-2"
          >
            <User className="h-4 w-4" />
            Free
          </Button>
          <Button 
            variant="outline"
            onClick={() => setTestSubscription('creator')}
            className="gap-2"
          >
            <Star className="h-4 w-4" />
            Creator
          </Button>
          <Button 
            variant="outline"
            onClick={() => setTestSubscription('maestro')}
            className="gap-2"
          >
            <Crown className="h-4 w-4" />
            Maestro
          </Button>
        </div>
      </div>
    </div>
  );
}