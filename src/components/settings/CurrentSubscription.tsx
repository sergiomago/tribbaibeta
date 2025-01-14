import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface CurrentSubscriptionProps {
  planType: string;
  interval: string;
  trialEnd: string | null;
  currentPeriodEnd: string;
}

export const CurrentSubscription = ({
  planType,
  interval,
  trialEnd,
  currentPeriodEnd,
}: CurrentSubscriptionProps) => {
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
          <div>{format(new Date(currentPeriodEnd), 'PPP')}</div>
        </div>
        <div className="text-sm text-muted-foreground">
          You can cancel or change your plan at any time
        </div>
      </CardContent>
    </Card>
  );
};