import { AppNavbar } from "@/components/AppNavbar";
import { RoleForm, RoleFormValues } from "@/components/roles/RoleForm";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useRoleMind } from "@/hooks/useRoleMind";

const CreateRole = () => {
  const { toast } = useToast();
  const { session } = useAuth();
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const { createMind } = useRoleMind(null);

  const handleSubmit = async (values: RoleFormValues) => {
    if (!session?.user.id) return;
    
    setIsCreating(true);
    try {
      // Create role in Supabase
      const { data: role, error } = await supabase
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

      if (error) throw error;

      // Create mind for the new role
      await createMind.mutateAsync();

      toast({
        title: "Success",
        description: "Role created successfully with associated mind",
      });
      
      navigate('/roles');
    } catch (error) {
      console.error('Error creating role:', error);
      toast({
        title: "Error",
        description: `Failed to create role: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col w-full bg-gradient-to-br from-purple-50 to-white dark:from-gray-900 dark:to-gray-800">
      <AppNavbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">Create New Role</h1>
          <RoleForm onSubmit={handleSubmit} isCreating={isCreating} />
        </div>
      </main>
    </div>
  );
};

export default CreateRole;