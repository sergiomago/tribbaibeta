
import { useToast } from "./use-toast";
import { supabase } from "@/lib/supabase";
import { RoleFormValues } from "@/components/roles/RoleForm";
import { UseFormReturn } from "react-hook-form";

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

  const handleSubmit = async (values: RoleFormValues) => {
    try {
      // Check role limits for Creator plan
      if (!defaultValues?.id && form.getValues('planType') === 'creator') {
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

      // Call the parent onSubmit
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
            const { error: mindError } = await supabase.functions.invoke('create-role-mind', {
              body: { roleId }
            });

            if (mindError) throw mindError;

            toast({
              title: "Success",
              description: "Role and mind created successfully.",
            });
          }
        } catch (error) {
          console.error('Error initializing mind:', error);
          toast({
            title: "Warning",
            description: "Role created but mind initialization failed. You can try again later.",
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
