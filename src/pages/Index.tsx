import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { RoleForm, RoleFormValues } from "@/components/roles/RoleForm";
import { RoleList } from "@/components/roles/RoleList";
import { Button } from "@/components/ui/button";
import { PlusCircle, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

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
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-purple-50 to-white dark:from-gray-900 dark:to-gray-800">
        <AppSidebar />
        <main className="flex-1 p-8">
          <div className="container mx-auto">
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Your Roles
                </h2>
                <p className="mt-2 text-gray-600 dark:text-gray-300">
                  Create and manage your AI assistants
                </p>
              </div>
              <Button
                onClick={() => setShowForm(!showForm)}
                className="bg-primary hover:bg-primary/90 text-white"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                New Role
              </Button>
            </div>

            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <Input
                  type="text"
                  placeholder="Search roles..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-[400px,1fr]">
              {showForm && (
                <div className="glass p-6 rounded-xl border shadow-sm animate-in fade-in slide-in-from-left duration-500">
                  <h3 className="text-xl font-semibold mb-4">Create New Role</h3>
                  <RoleForm onSubmit={handleSubmit} isCreating={isCreating} />
                </div>
              )}

              <div className={showForm ? "lg:col-start-2" : "lg:col-span-2"}>
                <div className="glass rounded-xl border shadow-sm p-6">
                  <RoleList roles={filteredRoles} isLoading={isLoadingRoles} />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Index;