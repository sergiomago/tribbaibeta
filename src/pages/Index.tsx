import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { RoleForm, RoleFormValues } from "@/components/roles/RoleForm";
import { RoleList } from "@/components/roles/RoleList";
import { AppNavbar } from "@/components/AppNavbar";
import { ChatLayout } from "@/components/chat/ChatLayout";

const Index = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { user } = useAuth();

  const { data: roles, isLoading: isLoadingRoles } = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("roles").select("*");
      if (error) throw error;
      return data;
    },
  });

  const createRole = useMutation({
    mutationFn: async (values: RoleFormValues) => {
      if (!user) throw new Error("User not authenticated");
      
      setIsCreating(true);
      try {
        const { data: assistantData, error: assistantError } = await supabase.functions.invoke(
          "create-assistant",
          {
            body: JSON.stringify(values),
          }
        );

        if (assistantError) throw assistantError;

        const roleData = {
          name: values.name,
          alias: values.alias || null,
          tag: values.tag,
          description: values.description || null,
          instructions: values.instructions,
          model: values.model,
          user_id: user.id,
          assistant_id: assistantData.assistant_id,
        };

        const { data, error } = await supabase.from("roles").insert(roleData);

        if (error) throw error;
        return data;
      } finally {
        setIsCreating(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast({
        title: "Success",
        description: "Role created successfully",
      });
      setShowForm(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create role: " + error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (values: RoleFormValues) => {
    createRole.mutate(values);
  };

  const filteredRoles = roles?.filter(
    (role) =>
      role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      role.tag.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (role.description &&
        role.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen flex flex-col w-full bg-gradient-to-br from-purple-50 to-white dark:from-gray-900 dark:to-gray-800">
      <AppNavbar />
      <main className="flex-1">
        <ChatLayout />
      </main>
    </div>
  );
};

export default Index;
