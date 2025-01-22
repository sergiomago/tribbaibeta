import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { PlanFeatures } from "./PlanFeatures";
import { PlanPricing } from "./PlanPricing";

interface UpgradeSubscriptionCardProps {
  variant?: 'default' | 'compact' | 'modal';
  showCreatorPlan?: boolean;
  context?: 'messages' | 'threads' | 'roles';
}

const CREATOR_FEATURES = [
  "Limited to 7 Total Roles",
  "GPT-4-mini Model",
  "Basic Templates",
  "Cancel Anytime"
];

const MAESTRO_FEATURES = [
  "Unlimited Roles",
  "Enhanced GPT-4 Model",
  "Premium Templates",
  "Web Search Capability",
  "Document Analysis",
  "Image Understanding",
  "Cancel or Downgrade Anytime"
];

const PRICING = {
  creator: {
    monthly: 15,
    yearly: 150
  },
  maestro: {
    monthly: 30,
    yearly: 300,
    firstMonth: 15
  }
};

export const UpgradeSubscriptionCard = ({ 
  variant = 'default',
  showCreatorPlan = true,
  context
}: UpgradeSubscriptionCardProps) => {
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month');
  const { startSubscription } = useSubscription();

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
                  Creator: ${PRICING.creator.monthly}/month
                </Button>
              )}
              <Button 
                className="bg-gradient-primary"
                onClick={() => startSubscription("maestro", billingInterval)}
              >
                Maestro: ${PRICING.maestro.firstMonth} first month
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
                <PlanPricing
                  monthlyPrice={PRICING.creator.monthly}
                  yearlyPrice={PRICING.creator.yearly}
                  billingInterval={billingInterval}
                />
                <PlanFeatures features={CREATOR_FEATURES} />
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
              <PlanPricing
                monthlyPrice={PRICING.maestro.firstMonth}
                yearlyPrice={PRICING.maestro.yearly}
                billingInterval={billingInterval}
                isFirstMonth={billingInterval === 'month'}
                regularPrice={PRICING.maestro.monthly}
              />
              <PlanFeatures features={MAESTRO_FEATURES} />
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