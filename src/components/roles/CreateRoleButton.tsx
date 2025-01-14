import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

type CreateRoleButtonProps = {
  isDisabled: boolean;
  planType: string | null;
  roleCount: number | undefined;
};

export const CreateRoleButton = ({ isDisabled, planType, roleCount }: CreateRoleButtonProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleCreateRole = () => {
    const maxRoles = planType === 'creator' ? 7 : 3;
    const isAtLimit = roleCount && roleCount >= maxRoles;

    if (isAtLimit) {
      const message = planType === 'creator' 
        ? "You've reached the limit of 7 roles on the Creator plan. Upgrade to Maestro for unlimited roles."
        : "You've reached the free tier limit of 3 roles. Upgrade to Creator for up to 7 roles, or Maestro for unlimited roles.";
      
      toast({
        title: "Role limit reached",
        description: message,
        variant: "destructive",
      });
      return;
    }
    navigate('/roles/create');
  };

  return (
    <Button 
      onClick={handleCreateRole}
      className="gap-2"
      disabled={isDisabled}
    >
      <Plus className="h-4 w-4" />
      Create Role
    </Button>
  );
};