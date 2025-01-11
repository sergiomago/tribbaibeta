import { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { BaseRoleCard } from "./BaseRoleCard";
import { Plus } from "lucide-react";

type TemplateRoleCardProps = {
  role: Tables<"roles">;
  onUseTemplate: (role: Tables<"roles">) => void;
};

export const TemplateRoleCard = ({ role, onUseTemplate }: TemplateRoleCardProps) => {
  return (
    <BaseRoleCard role={role}>
      <div className="absolute inset-x-0 bottom-4 px-6">
        <Button
          className="w-full bg-gradient-primary gap-2"
          onClick={() => onUseTemplate(role)}
        >
          <Plus className="h-4 w-4" />
          Use Template
        </Button>
      </div>
    </BaseRoleCard>
  );
};