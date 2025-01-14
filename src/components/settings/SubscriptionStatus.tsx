import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { format } from "date-fns";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Check } from "lucide-react";

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
    const creatorMonthlyPrice = 15;
    const maestroMonthlyPrice = 30;
    const creatorYearlyPrice = 150;
    const maestroYearlyPrice = 300;
    const firstMonthMaestroPrice = creatorMonthlyPrice; // 50% off first month

    return (
      <Card>
        <CardHeader>
          <CardTitle>Choose a Plan</CardTitle>
          <CardDescription>Select a plan to unlock more features</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-end space-x-2">
            <Label htmlFor="billing-interval">Bill Yearly (Save more)</Label>
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
                <CardDescription>For getting started</CardDescription>
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
                      Save ${(creatorMonthlyPrice * 12) - creatorYearlyPrice}/year
                    </div>
                  )}
                </div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4" />
                    Limited to 7 Total Roles
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4" />
                    GPT-4-mini Model
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4" />
                    Basic Templates
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4" />
                    Cancel Anytime
                  </li>
                </ul>
                <Button 
                  className="w-full"
                  onClick={() => startSubscription("creator", billingInterval)}
                >
                  Subscribe Now
                </Button>
              </CardContent>
            </Card>
            
            <Card className="border-2 border-primary">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Maestro</CardTitle>
                    <CardDescription>For power users</CardDescription>
                  </div>
                  <span className="px-2.5 py-0.5 text-xs font-semibold bg-primary text-primary-foreground rounded-full">
                    50% Off First Month
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {billingInterval === 'month' ? (
                    <>
                      <div className="text-2xl font-bold">
                        ${firstMonthMaestroPrice}
                        <span className="text-sm font-normal text-muted-foreground">
                          /first month
                        </span>
                      </div>
                      <div className="text-sm text-green-600">
                        Then ${maestroMonthlyPrice}/month
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-2xl font-bold">
                        ${maestroYearlyPrice}
                        <span className="text-sm font-normal text-muted-foreground">/year</span>
                      </div>
                      <div className="text-sm text-green-600">
                        Save ${(maestroMonthlyPrice * 12) - maestroYearlyPrice}/year
                      </div>
                    </>
                  )}
                </div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4" />
                    Unlimited Roles
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4" />
                    Enhanced GPT-4 Model
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4" />
                    Premium Templates
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4" />
                    Web Search Capability
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4" />
                    Document Analysis
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4" />
                    Image Understanding
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4" />
                    7-day Free Trial
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4" />
                    Cancel or Downgrade Anytime
                  </li>
                </ul>
                <Button 
                  className="w-full bg-gradient-primary"
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
        <div className="text-sm text-muted-foreground">
          You can cancel or change your plan at any time
        </div>
      </CardContent>
    </Card>
  );
};