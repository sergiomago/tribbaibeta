import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Check } from "lucide-react";
import { useSubscription } from "@/contexts/SubscriptionContext";

interface UpgradeSubscriptionCardProps {
  variant?: 'default' | 'compact' | 'modal';
  showCreatorPlan?: boolean;
  context?: 'messages' | 'threads' | 'roles';
}

export const UpgradeSubscriptionCard = ({ 
  variant = 'default',
  showCreatorPlan = true,
  context
}: UpgradeSubscriptionCardProps) => {
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month');
  const { startSubscription } = useSubscription();

  const creatorMonthlyPrice = 15;
  const maestroMonthlyPrice = 30;
  const creatorYearlyPrice = 150;
  const maestroYearlyPrice = 300;
  const firstMonthMaestroPrice = creatorMonthlyPrice; // 50% off first month

  const getContextMessage = () => {
    switch (context) {
      case 'messages':
        return "Upgrade to send unlimited messages";
      case 'threads':
        return "Upgrade to create unlimited chat threads";
      case 'roles':
        return showCreatorPlan 
          ? "Upgrade to create more custom roles" 
          : "Upgrade to Maestro for unlimited roles";
      default:
        return "Choose a plan to unlock more features";
    }
  };

  if (variant === 'compact') {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="space-y-2">
            <h3 className="font-semibold">{getContextMessage()}</h3>
            <div className="flex gap-4">
              {showCreatorPlan && (
                <Button 
                  variant="outline" 
                  onClick={() => startSubscription("creator", billingInterval)}
                >
                  Creator: ${creatorMonthlyPrice}/month
                </Button>
              )}
              <Button 
                className="bg-gradient-primary"
                onClick={() => startSubscription("maestro", billingInterval)}
              >
                Maestro: ${firstMonthMaestroPrice} first month
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{getContextMessage()}</CardTitle>
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
          {showCreatorPlan && (
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
          )}
          
          <Card className="border-2 border-primary">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Maestro</CardTitle>
                  <CardDescription>For power users</CardDescription>
                </div>
                <span className="px-2.5 py-0.5 text-xs font-semibold bg-primary text-primary-foreground rounded-full">
                  Recommended
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="text-2xl font-bold">
                  ${billingInterval === 'month' ? firstMonthMaestroPrice : maestroYearlyPrice}
                  <span className="text-sm font-normal text-muted-foreground">
                    /{billingInterval === 'month' ? 'first month' : 'year'}
                  </span>
                </div>
                {billingInterval === 'month' && (
                  <div className="text-sm text-green-600">
                    50% off first month, then ${maestroMonthlyPrice}/month
                  </div>
                )}
                {billingInterval === 'year' && (
                  <div className="text-sm text-green-600">
                    Save ${(maestroMonthlyPrice * 12) - maestroYearlyPrice}/year
                  </div>
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
};