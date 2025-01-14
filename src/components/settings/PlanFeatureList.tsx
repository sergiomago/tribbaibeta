import { Check } from "lucide-react";

interface PlanFeatureListProps {
  features: string[];
}

export const PlanFeatureList = ({ features }: PlanFeatureListProps) => {
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