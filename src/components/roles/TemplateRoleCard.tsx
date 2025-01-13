import { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { BaseRoleCard } from "./BaseRoleCard";
import { Plus, Lock } from "lucide-react";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useToast } from "@/hooks/use-toast";

type TemplateRoleCardProps = {
  role: Tables<"roles">;
  onUseTemplate: (role: Tables<"roles">) => void;
  isPremium?: boolean;
};

export const TemplateRoleCard = ({ role, onUseTemplate, isPremium = false }: TemplateRoleCardProps) => {
  const { planType } = useSubscription();
  const { toast } = useToast();

  const handleUseTemplate = () => {
    if (isPremium && planType !== 'maestro') {
      toast({
        title: "Premium Template",
        description: "This template is only available with the Maestro plan. Please upgrade to use it.",
        variant: "destructive",
      });
      return;
    }
    onUseTemplate(role);
  };

  return (
    <BaseRoleCard role={role}>
      <div className="absolute inset-x-0 bottom-4 px-6">
        <Button
          className={`w-full gap-2 ${isPremium && planType !== 'maestro' ? 'bg-gray-500' : 'bg-gradient-primary'}`}
          onClick={handleUseTemplate}
        >
          {isPremium && planType !== 'maestro' ? (
            <>
              <Lock className="h-4 w-4" />
              Maestro Only
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              Use Template
            </>
          )}
        </Button>
      </div>
    </BaseRoleCard>
  );
};