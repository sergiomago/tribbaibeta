interface PlanPricingProps {
  monthlyPrice: number;
  yearlyPrice: number;
  billingInterval: 'month' | 'year';
  isFirstMonth?: boolean;
  regularPrice?: number;
}

export const PlanPricing = ({ 
  monthlyPrice, 
  yearlyPrice, 
  billingInterval,
  isFirstMonth,
  regularPrice
}: PlanPricingProps) => {
  const price = billingInterval === 'month' ? monthlyPrice : yearlyPrice;
  const savings = billingInterval === 'year' 
    ? (monthlyPrice * 12) - yearlyPrice 
    : undefined;

  return (
    <div className="space-y-2">
      <div className="text-2xl font-bold">
        ${price}
        <span className="text-sm font-normal text-muted-foreground">
          /{billingInterval === 'month' ? (isFirstMonth ? 'first month' : 'month') : 'year'}
        </span>
      </div>
      {billingInterval === 'month' && isFirstMonth && regularPrice && (
        <div className="text-sm text-green-600">
          50% off first month, then ${regularPrice}/month
        </div>
      )}
      {savings && (
        <div className="text-sm text-green-600">
          Save ${savings}/year
        </div>
      )}
    </div>
  );
};