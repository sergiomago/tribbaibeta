import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface BillingIntervalToggleProps {
  billingInterval: 'month' | 'year';
  onChange: (checked: boolean) => void;
}

export const BillingIntervalToggle = ({ 
  billingInterval, 
  onChange 
}: BillingIntervalToggleProps) => {
  return (
    <div className="flex items-center justify-end space-x-2">
      <Label htmlFor="billing-interval">Bill Yearly (Save more)</Label>
      <Switch
        id="billing-interval"
        checked={billingInterval === 'year'}
        onCheckedChange={onChange}
      />
    </div>
  );
};