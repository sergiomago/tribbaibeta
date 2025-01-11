import { useState } from "react";
import { Package, ChevronDown, ChevronRight } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RoleCard } from "./RoleCard";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export function RolePackages() {
  const [openPackages, setOpenPackages] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: templateRoles } = useQuery({
    queryKey: ["template-roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roles")
        .select("*")
        .eq("is_template", true)
        .order("package_order");
      
      if (error) throw error;
      return data;
    },
  });

  const createRoleMutation = useMutation({
    mutationFn: async (templateRole: any) => {
      const { name, alias, tag, description, instructions, model } = templateRole;
      const { error } = await supabase
        .from("roles")
        .insert({
          name,
          alias,
          tag,
          description,
          instructions,
          model,
          user_id: user?.id,
          is_template: false
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
    },
  });

  const packages = templateRoles?.reduce((acc, role) => {
    if (!role.package_name) return acc;
    if (!acc[role.package_name]) {
      acc[role.package_name] = [];
    }
    acc[role.package_name].push(role);
    return acc;
  }, {} as Record<string, typeof templateRoles>);

  const handleUseTemplate = async (templateRole: any) => {
    if (!user) return;

    try {
      await createRoleMutation.mutateAsync(templateRole);
      toast({
        title: "Success",
        description: `Created new role from template: ${templateRole.name}`,
      });
    } catch (error) {
      console.error("Error creating role from template:", error);
      toast({
        title: "Error",
        description: "Failed to create role from template",
        variant: "destructive",
      });
    }
  };

  if (!packages || Object.keys(packages).length === 0) {
    return null;
  }

  return (
    <div className="space-y-6 mb-8">
      <h2 className="text-lg font-semibold">Pre-made Role Packages</h2>
      <div className="space-y-4">
        {Object.entries(packages).map(([packageName, roles]) => (
          <Collapsible
            key={packageName}
            open={openPackages[packageName]}
            onOpenChange={(isOpen) => 
              setOpenPackages(prev => ({ ...prev, [packageName]: isOpen }))
            }
            className="border rounded-lg p-4 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm"
          >
            <CollapsibleTrigger className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-medium">{packageName}</h3>
              </div>
              {openPackages[packageName] ? (
                <ChevronDown className="h-5 w-5" />
              ) : (
                <ChevronRight className="h-5 w-5" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4">
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {roles.map((role) => (
                  <div key={role.id} className="relative">
                    <RoleCard
                      role={role}
                      onDelete={() => {}}
                      onStartChat={() => {}}
                      onEdit={() => {}}
                      isTemplate
                    />
                    <div className="absolute inset-x-0 bottom-4 px-6">
                      <Button
                        className="w-full bg-gradient-primary"
                        onClick={() => handleUseTemplate(role)}
                      >
                        Use Template
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>
    </div>
  );
}