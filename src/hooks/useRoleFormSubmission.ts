
import { useToast } from "./use-toast";
import { supabase } from "@/lib/supabase";
import { RoleFormValues } from "@/components/roles/RoleForm";
import { UseFormReturn } from "react-hook-form";
import { useSubscription } from "@/contexts/SubscriptionContext";

type UseRoleFormSubmissionProps = {
  form: UseFormReturn<RoleFormValues>;
  onSubmit: (values: RoleFormValues) => void;
  defaultValues?: RoleFormValues;
  setIsInitializingMind: (value: boolean) => void;
};

export const useRoleFormSubmission = ({
  form,
  onSubmit,
  defaultValues,
  setIsInitializingMind,
}: UseRoleFormSubmissionProps) => {
  const { toast } = useToast();
  const { planType } = useSubscription();

  const handleSubmit = async (values: RoleFormValues) => {
    try {
      // Check role limits for Creator plan
      if (!defaultValues?.id && planType === 'creator') {
        const { count, error: countError } = await supabase
          .from('roles')
          .select('id', { count: 'exact' })
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
          .not('is_template', 'eq', true);

        if (countError) {
          toast({
            title: "Error",
            description: "Could not verify role count. Please try again.",
            variant: "destructive",
          });
          return;
        }

        if (count && count >= 7) {
          toast({
            title: "Role Limit Reached",
            description: "Creator plan is limited to 7 roles. Please upgrade to Maestro plan for unlimited roles.",
            variant: "destructive",
          });
          return;
        }
      }

      // Call the parent onSubmit to create/update the role
      await onSubmit(values);

      // If this is a new role (no id), initialize the mind
      if (!defaultValues?.id) {
        setIsInitializingMind(true);
        try {
          const { data: roles } = await supabase
            .from('roles')
            .select('id')
            .eq('name', values.name)
            .limit(1);

          if (roles && roles.length > 0) {
            const roleId = roles[0].id;
            
            // Update role status to active
            await supabase
              .from('roles')
              .update({
                mind_status: 'active',
                updated_at: new Date().toISOString()
              })
              .eq('id', roleId);

            toast({
              title: "Success",
              description: "Role created successfully.",
            });
          }
        } catch (error) {
          console.error('Error initializing role:', error);
          toast({
            title: "Warning",
            description: "Role created but initialization failed. You can try again later.",
            variant: "destructive",
          });
        } finally {
          setIsInitializingMind(false);
        }
      }
    } catch (error) {
      console.error('Error in form submission:', error);
      toast({
        title: "Error",
        description: `Failed to create role: ${error.message}`,
        variant: "destructive",
      });
      setIsInitializingMind(false);
    }
  };

  return { handleSubmit };
};
