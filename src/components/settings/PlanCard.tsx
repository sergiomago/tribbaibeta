import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PlanFeatureList } from "./PlanFeatureList";
import { PlanPricing } from "./PlanPricing";

interface PlanCardProps {
  title: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  billingInterval: 'month' | 'year';
  features: string[];
  onSubscribe: () => void;
  badge?: string;
  isHighlighted?: boolean;
  buttonText?: string;
  isFirstMonth?: boolean;
  regularPrice?: number;
}

export const PlanCard = ({
  title,
  description,
  monthlyPrice,
  yearlyPrice,
  billingInterval,
  features,
  onSubscribe,
  badge,
  isHighlighted,
  buttonText = "Subscribe Now",
  isFirstMonth,
  regularPrice
}: PlanCardProps) => {
  return (
    <Card className={isHighlighted ? "border-2 border-primary" : ""}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          {badge && (
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-primary text-primary-foreground rounded-full">
              {badge}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <PlanPricing
          monthlyPrice={monthlyPrice}
          yearlyPrice={yearlyPrice}
          billingInterval={billingInterval}
          isFirstMonth={isFirstMonth}
          regularPrice={regularPrice}
        />
        <PlanFeatureList features={features} />
        <Button 
          className={`w-full ${isHighlighted ? 'bg-gradient-primary' : ''}`}
          onClick={onSubscribe}
        >
          {buttonText}
        </Button>
      </CardContent>
    </Card>
  );
};