
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

type SubmitButtonProps = {
  isCreating: boolean;
  isInitializingMind: boolean;
  isUpdate: boolean;
};

export const SubmitButton = ({ isCreating, isInitializingMind, isUpdate }: SubmitButtonProps) => {
  return (
    <Button
      type="submit"
      className="w-full"
      disabled={isCreating || isInitializingMind}
    >
      {isCreating || isInitializingMind ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {isInitializingMind ? "Initializing..." : "Creating..."}
        </>
      ) : isUpdate ? "Update Role" : "Create Role"}
    </Button>
  );
};
