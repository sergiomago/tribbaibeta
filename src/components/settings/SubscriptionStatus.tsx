import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { format } from "date-fns";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export const SubscriptionStatus = () => {
  const { 
    hasSubscription, 
    planType, 
    interval,
    trialEnd, 
    currentPeriodEnd, 
    isLoading,
    startSubscription 
  } = useSubscription();
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month');

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
    const yearlyDiscount = 20; // 20% discount for yearly plans
    const creatorMonthlyPrice = 15;
    const maestroMonthlyPrice = 30;
    const creatorYearlyPrice = Math.floor(creatorMonthlyPrice * 12 * (1 - yearlyDiscount / 100));
    const maestroYearlyPrice = Math.floor(maestroMonthlyPrice * 12 * (1 - yearlyDiscount / 100));

    return (
      <Card>
        <CardHeader>
          <CardTitle>Choose a Plan</CardTitle>
          <CardDescription>Select a plan to get started with Tribbai</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-end space-x-2">
            <Label htmlFor="billing-interval">Bill Yearly (Save 20%)</Label>
            <Switch
              id="billing-interval"
              checked={billingInterval === 'year'}
              onCheckedChange={(checked) => setBillingInterval(checked ? 'year' : 'month')}
            />
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Creator</CardTitle>
                <CardDescription>Perfect for getting started</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="text-2xl font-bold">
                    ${billingInterval === 'month' ? creatorMonthlyPrice : creatorYearlyPrice}
                    <span className="text-sm font-normal text-muted-foreground">
                      /{billingInterval}
                    </span>
                  </div>
                  {billingInterval === 'year' && (
                    <div className="text-sm text-green-600">
                      Save ${creatorMonthlyPrice * 12 - creatorYearlyPrice}/year
                    </div>
                  )}
                </div>
                <ul className="space-y-2 text-sm">
                  <li>7 Custom Roles</li>
                  <li>GPT-3.5 Model</li>
                  <li>7-day free trial</li>
                </ul>
                <Button 
                  className="w-full"
                  onClick={() => startSubscription("creator", billingInterval)}
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
                <div className="space-y-2">
                  <div className="text-2xl font-bold">
                    ${billingInterval === 'month' ? maestroMonthlyPrice : maestroYearlyPrice}
                    <span className="text-sm font-normal text-muted-foreground">
                      /{billingInterval}
                    </span>
                  </div>
                  {billingInterval === 'year' && (
                    <div className="text-sm text-green-600">
                      Save ${maestroMonthlyPrice * 12 - maestroYearlyPrice}/year
                    </div>
                  )}
                </div>
                <ul className="space-y-2 text-sm">
                  <li>Unlimited Roles</li>
                  <li>GPT-4 Model</li>
                  <li>Special Roles Access</li>
                  <li>7-day free trial</li>
                </ul>
                <Button 
                  className="w-full"
                  onClick={() => startSubscription("maestro", billingInterval)}
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
          <div className="capitalize">{planType} ({interval}ly)</div>
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