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
  return (
    <div className="space-y-2">
      {billingInterval === 'month' ? (
        <>
          <div className="text-2xl font-bold">
            ${isFirstMonth ? monthlyPrice : regularPrice || monthlyPrice}
            <span className="text-sm font-normal text-muted-foreground">
              {isFirstMonth ? '/first month' : '/month'}
            </span>
          </div>
          {isFirstMonth && regularPrice && (
            <div className="text-sm text-green-600">
              Then ${regularPrice}/month
            </div>
          )}
        </>
      ) : (
        <>
          <div className="text-2xl font-bold">
            ${yearlyPrice}
            <span className="text-sm font-normal text-muted-foreground">/year</span>
          </div>
          <div className="text-sm text-green-600">
            Save ${(monthlyPrice * 12) - yearlyPrice}/year
          </div>
        </>
      )}
    </div>
  );
};