import { Check } from "lucide-react";

interface PlanFeaturesProps {
  features: string[];
}

export const PlanFeatures = ({ features }: PlanFeaturesProps) => {
  return (
    <ul className="space-y-2 text-sm">
      {features.map((feature, index) => (
        <li key={index} className="flex items-center gap-2">
          <Check className="h-4 w-4" />
          {feature}
        </li>
      ))}
    </ul>
  );
};