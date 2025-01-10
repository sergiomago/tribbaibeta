import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { RoleForm } from "@/components/roles/RoleForm";
import { Tables } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";
import { AppNavbar } from "@/components/AppNavbar";

const EditRole = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();

  const { data: role, isLoading } = useQuery({
    queryKey: ['role', id],
    queryFn: async () => {
      if (!id) throw new Error('Role ID is required');
      
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Tables<"roles">;
    },
    enabled: !!id,
  });

  const handleSubmit = async (formData: {
    name: string;
    alias?: string;
    description?: string;
    instructions: string;
    model: "gpt-4o" | "gpt-4o-mini";
    tag: string;
  }) => {
    try {
      if (!id) throw new Error('Role ID is required');

      const { error } = await supabase
        .from('roles')
        .update({
          name: formData.name,
          alias: formData.alias,
          description: formData.description,
          instructions: formData.instructions,
          model: formData.model,
          tag: formData.tag,
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Role updated successfully",
      });

      navigate('/roles');
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: "Error",
        description: "Failed to update role",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div>
        <AppNavbar />
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!role) {
    return (
      <div>
        <AppNavbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Role not found</h2>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <AppNavbar />
      <div className="container mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Edit Role</h2>
        <RoleForm
          initialData={{
            id: role.id,
            name: role.name,
            alias: role.alias || undefined,
            description: role.description || undefined,
            instructions: role.instructions,
            model: role.model as "gpt-4o" | "gpt-4o-mini",
            tag: role.tag,
          }}
          onSubmit={handleSubmit}
          isCreating={false}
        />
      </div>
    </div>
  );
};

export default EditRole;