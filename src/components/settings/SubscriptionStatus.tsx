import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { format } from "date-fns";

export const SubscriptionStatus = () => {
  const { 
    hasSubscription, 
    planType, 
    trialEnd, 
    currentPeriodEnd, 
    isLoading,
    startSubscription 
  } = useSubscription();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
          <CardDescription>Loading subscription status...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!hasSubscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Choose a Plan</CardTitle>
          <CardDescription>Select a plan to get started with Tribbai</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Creator</CardTitle>
                <CardDescription>Perfect for getting started</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-2xl font-bold">$15/month</div>
                <ul className="space-y-2 text-sm">
                  <li>7 Custom Roles</li>
                  <li>GPT-3.5 Model</li>
                  <li>7-day free trial</li>
                </ul>
                <Button 
                  className="w-full"
                  onClick={() => startSubscription("creator")}
                >
                  Start Free Trial
                </Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Maestro</CardTitle>
                <CardDescription>For power users</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-2xl font-bold">$30/month</div>
                <ul className="space-y-2 text-sm">
                  <li>Unlimited Roles</li>
                  <li>GPT-4 Model</li>
                  <li>Special Roles Access</li>
                  <li>7-day free trial</li>
                </ul>
                <Button 
                  className="w-full"
                  onClick={() => startSubscription("maestro")}
                >
                  Start Free Trial
                </Button>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Current Subscription</CardTitle>
        <CardDescription>Your subscription details</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="font-semibold">Plan</div>
          <div className="capitalize">{planType}</div>
        </div>
        {trialEnd && new Date(trialEnd) > new Date() && (
          <div>
            <div className="font-semibold">Trial Ends</div>
            <div>{format(new Date(trialEnd), 'PPP')}</div>
          </div>
        )}
        <div>
          <div className="font-semibold">Next Billing Date</div>
          <div>{format(new Date(currentPeriodEnd!), 'PPP')}</div>
        </div>
      </CardContent>
    </Card>
  );
};