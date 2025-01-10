import { AppNavbar } from "@/components/AppNavbar";
import { RoleForm, RoleFormValues } from "@/components/roles/RoleForm";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const EditRole = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: role, isLoading } = useQuery({
    queryKey: ['role', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  const updateRole = useMutation({
    mutationFn: async (values: RoleFormValues) => {
      const { error } = await supabase
        .from('roles')
        .update(values)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Role updated successfully",
      });
      navigate('/roles');
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update role: " + (error as Error).message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <AppNavbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!role) {
    return (
      <div className="min-h-screen flex flex-col">
        <AppNavbar />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-lg text-gray-600">Role not found</p>
        </div>
      </div>
    );
  }

  const formValues: RoleFormValues = {
    id: role.id,
    name: role.name,
    alias: role.alias || "",
    tag: role.tag,
    description: role.description || "",
    instructions: role.instructions,
    model: role.model === "gpt-4o" || role.model === "gpt-4o-mini" ? role.model : "gpt-4o",
  };

  return (
    <div className="min-h-screen flex flex-col">
      <AppNavbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">Edit Role</h1>
          <RoleForm
            defaultValues={formValues}
            onSubmit={(values) => updateRole.mutate(values)}
            isCreating={updateRole.isPending}
          />
        </div>
      </main>
    </div>
  );
};

export default EditRole;