import { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { BaseRoleCard } from "./BaseRoleCard";
import { Plus, Lock, FileText, Globe } from "lucide-react";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useToast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

  const getRoleIcon = () => {
    if (role.tag === '@docanalyst') return FileText;
    if (role.tag === '@web') return Globe;
    return null;
  };

  const getRoleTooltip = () => {
    if (role.tag === '@docanalyst') return "Upload and analyze files in chat with @docanalyst";
    if (role.tag === '@web') return "Search the web in real-time with @web";
    return "";
  };

  const RoleIcon = getRoleIcon();
  const roleTooltip = getRoleTooltip();

  return (
    <div className={`relative ${isPremium ? 'group' : ''}`}>
      {isPremium && (
        <div className="absolute -inset-px rounded-lg bg-gradient-to-r from-primary/30 via-primary/10 to-primary/30 opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
      )}
      <BaseRoleCard role={role}>
        {RoleIcon && roleTooltip && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="absolute top-4 right-4">
                <RoleIcon className="h-5 w-5 text-primary" />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">{roleTooltip}</p>
            </TooltipContent>
          </Tooltip>
        )}
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
    </div>
  );
};