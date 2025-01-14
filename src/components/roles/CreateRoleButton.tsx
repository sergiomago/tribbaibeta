import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { UpgradeSubscriptionCard } from "@/components/subscription/UpgradeSubscriptionCard";

type CreateRoleButtonProps = {
  isDisabled: boolean;
  planType: string | null;
  roleCount: number | undefined;
};

export const CreateRoleButton = ({ isDisabled, planType, roleCount }: CreateRoleButtonProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);

  const handleCreateRole = () => {
    const maxRoles = planType === 'creator' ? 7 : 3;
    const isAtLimit = roleCount && roleCount >= maxRoles;

    if (isAtLimit) {
      setShowUpgradeDialog(true);
      return;
    }
    navigate('/roles/create');
  };

  return (
    <>
      <Button 
        onClick={handleCreateRole}
        className="gap-2"
        disabled={isDisabled}
      >
        <Plus className="h-4 w-4" />
        Create Role
      </Button>

      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className="max-w-3xl">
          <UpgradeSubscriptionCard 
            variant="modal"
            showCreatorPlan={planType !== 'creator'}
            context="roles"
          />
        </DialogContent>
      </Dialog>
    </>
  );
};