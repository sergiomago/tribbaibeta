import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { BillingIntervalToggle } from "./BillingIntervalToggle";
import { PlanCard } from "./PlanCard";
import { CurrentSubscription } from "./CurrentSubscription";

export const SubscriptionStatus = () => {
  const { 
    hasSubscription, 
    planType, 
    interval,
    trialEnd, 
    currentPeriodEnd, 
    isLoading,
    startSubscription,
    startTrial,
    trialStarted 
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

    const creatorFeatures = [
      "Limited to 7 Total Roles",
      "GPT-4-mini Model",
      "Basic Templates",
      "Cancel Anytime"
    ];

    const maestroFeatures = [
      "Unlimited Roles",
      "Enhanced GPT-4 Model",
      "Premium Templates",
      "Web Search Capability",
      "Document Analysis",
      "Image Understanding",
      "Cancel or Downgrade Anytime"
    ];

    return (
      <Card>
        <CardHeader>
          <CardTitle>Choose a Plan</CardTitle>
          <CardDescription>Select a plan to unlock more features</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <BillingIntervalToggle
            billingInterval={billingInterval}
            onChange={(checked) => setBillingInterval(checked ? 'year' : 'month')}
          />
          
          <div className="grid gap-4 md:grid-cols-2">
            <PlanCard
              title="Creator"
              description="For getting started"
              monthlyPrice={creatorMonthlyPrice}
              yearlyPrice={creatorYearlyPrice}
              billingInterval={billingInterval}
              features={creatorFeatures}
              onSubscribe={() => startSubscription("creator", billingInterval)}
            />
            
            <PlanCard
              title="Maestro"
              description="For power users"
              monthlyPrice={firstMonthMaestroPrice}
              yearlyPrice={maestroYearlyPrice}
              billingInterval={billingInterval}
              features={maestroFeatures}
              onSubscribe={() => trialStarted ? startSubscription("maestro", billingInterval) : startTrial()}
              badge={!trialStarted ? "7-Day Free Trial" : undefined}
              isHighlighted
              buttonText={trialStarted ? 'Subscribe Now' : 'Start Free Trial'}
              isFirstMonth={billingInterval === 'month'}
              regularPrice={maestroMonthlyPrice}
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <CurrentSubscription
      planType={planType!}
      interval={interval!}
      trialEnd={trialEnd}
      currentPeriodEnd={currentPeriodEnd!}
    />
  );
};