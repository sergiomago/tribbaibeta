import { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { BaseRoleCard } from "./BaseRoleCard";

type TemplateRoleCardProps = {
  role: Tables<"roles">;
  onUseTemplate: (role: Tables<"roles">) => void;
};

export const TemplateRoleCard = ({ role, onUseTemplate }: TemplateRoleCardProps) => {
  return (
    <BaseRoleCard role={role}>
      <div className="absolute inset-x-0 bottom-4 px-6">
        <Button
          className="w-full bg-gradient-primary"
          onClick={() => onUseTemplate(role)}
        >
          Use Template
        </Button>
      </div>
    </BaseRoleCard>
  );
};