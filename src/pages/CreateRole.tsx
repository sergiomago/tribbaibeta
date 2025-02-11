
import { AppNavbar } from "@/components/AppNavbar";
import { RoleForm, RoleFormValues } from "@/components/roles/RoleForm";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useParams } from "react-router-dom";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

const CreateRole = () => {
  const { toast } = useToast();
  const { session } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const [isCreating, setIsCreating] = useState(false);

  const { data: role, isLoading } = useQuery({
    queryKey: ['role', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      // Transform the data to match RoleFormValues
      const formValues: RoleFormValues = {
        id: data.id,
        name: data.name,
        alias: data.alias || undefined,
        tag: data.tag,
        description: data.description || '',
        instructions: data.instructions,
        model: data.model === 'gpt-4o' ? 'gpt-4o' : 'gpt-4o-mini',
        special_capabilities: data.special_capabilities || []
      };

      return formValues;
    },
    enabled: !!id,
  });

  const handleSubmit = async (values: RoleFormValues) => {
    if (!session?.user.id) return;
    
    setIsCreating(true);
    try {
      if (id) {
        // Update existing role
        const { error } = await supabase
          .from('roles')
          .update({
            name: values.name,
            alias: values.alias,
            tag: values.tag,
            description: values.description,
            instructions: values.instructions,
            model: values.model,
            special_capabilities: values.special_capabilities,
          })
          .eq('id', id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Role updated successfully",
        });
        
        navigate('/roles');
      } else {
        // Create new role and initialize mind
        const { data: newRole, error: createError } = await supabase
          .from('roles')
          .insert({
            name: values.name,
            alias: values.alias,
            tag: values.tag,
            description: values.description,
            instructions: values.instructions,
            model: values.model,
            special_capabilities: values.special_capabilities,
            user_id: session.user.id
          })
          .select()
          .single();

        if (createError) throw createError;
        if (!newRole) throw new Error("Role created but no ID returned");

        // Initialize the mind using the edge function
        const { error: mindError } = await supabase.functions.invoke('create-role-mind', {
          body: { roleId: newRole.id }
        });

        if (mindError) {
          // If mind creation fails, we should still notify the user that the role was created
          toast({
            title: "Partial Success",
            description: "Role created but mind initialization failed. You can try reinitializing it later.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Success",
            description: "Role and mind created successfully",
          });
        }

        navigate('/roles');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${id ? 'update' : 'create'} role: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  if (id && isLoading) {
    return (
      <div className="min-h-screen flex flex-col w-full bg-gradient-to-br from-purple-50 to-white dark:from-gray-900 dark:to-gray-800">
        <AppNavbar />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">Loading role...</h1>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col w-full bg-gradient-to-br from-purple-50 to-white dark:from-gray-900 dark:to-gray-800">
      <AppNavbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">{id ? "Edit Role" : "Create New Role"}</h1>
          <RoleForm 
            onSubmit={handleSubmit} 
            isCreating={isCreating}
            defaultValues={role}
          />
        </div>
      </main>
    </div>
  );
};

export default CreateRole;

