import { AppNavbar } from "@/components/AppNavbar";
import { RoleForm } from "@/components/roles/RoleForm";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { RoleFormValues } from "@/components/roles/RoleForm";
import { useMutation } from "@tanstack/react-query";

const CreateRole = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const createRole = useMutation({
    mutationFn: async (values: RoleFormValues) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('roles')
        .insert({
          ...values,
          user_id: user.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Role created successfully",
      });
      navigate('/roles');
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create role: " + (error as Error).message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="min-h-screen flex flex-col">
      <AppNavbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">Create Role</h1>
          <RoleForm
            onSubmit={(values) => createRole.mutate(values)}
            isCreating={createRole.isPending}
          />
        </div>
      </main>
    </div>
  );
};

export default CreateRole;