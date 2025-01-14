import { useState } from "react";
import { Package, ChevronDown, ChevronRight, Crown } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TemplateRoleCard } from "./TemplateRoleCard";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { UpgradeSubscriptionCard } from "@/components/subscription/UpgradeSubscriptionCard";
import { useSubscription } from "@/contexts/SubscriptionContext";

export function RolePackages() {
  const [openPackages, setOpenPackages] = useState<Record<string, boolean>>({});
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { planType } = useSubscription();

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

  const { data: userRoles } = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("roles")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_template", false);
      
      if (error) throw error;
      return data;
    },
  });

  const createRoleMutation = useMutation({
    mutationFn: async (templateRole: any) => {
      if (!user) throw new Error("User not authenticated");

      // Check if tag already exists for user
      const existingTag = userRoles?.find(role => role.tag === templateRole.tag);
      if (existingTag) {
        throw new Error(`You already have a role with the tag "${templateRole.tag}"`);
      }

      // Check if user already used this template
      const existingTemplate = userRoles?.find(role => role.template_id === templateRole.id);
      if (existingTemplate) {
        throw new Error("You have already used this template");
      }

      const { error } = await supabase
        .from("roles")
        .insert({
          name: templateRole.name,
          alias: templateRole.alias,
          tag: templateRole.tag,
          description: templateRole.description,
          instructions: templateRole.instructions,
          model: templateRole.model,
          user_id: user.id,
          is_template: false,
          template_id: templateRole.id,
          source: 'template'
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast({
        title: "Success",
        description: "Role created from template successfully",
      });
    },
    onError: (error: Error) => {
      console.error("Error creating role from template:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleUseTemplate = async (templateRole: any) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to use templates",
        variant: "destructive",
      });
      return;
    }

    // Check role limits
    const maxRoles = planType === 'creator' ? 7 : 3;
    const isAtLimit = userRoles && userRoles.length >= maxRoles;

    if (isAtLimit) {
      setShowUpgradeDialog(true);
      return;
    }

    try {
      await createRoleMutation.mutateAsync(templateRole);
    } catch (error) {
      // Error is handled in mutation's onError
      console.error("Error in handleUseTemplate:", error);
    }
  };

  const packages = templateRoles?.reduce((acc, role) => {
    if (!role.package_name) return acc;
    if (!acc[role.package_name]) {
      acc[role.package_name] = [];
    }
    acc[role.package_name].push(role);
    return acc;
  }, {} as Record<string, typeof templateRoles>);

  if (!packages || Object.keys(packages).length === 0) {
    return null;
  }

  // Define premium packages
  const premiumPackages = ['Advanced', 'Professional', 'Expert'];

  return (
    <div className="space-y-6 mb-8">
      <h2 className="text-lg font-semibold">Pre-made Role Packages</h2>
      <div className="space-y-4">
        {Object.entries(packages).map(([packageName, roles]) => {
          const isMaestroPackage = packageName === 'Maestro';
          
          return (
            <Collapsible
              key={packageName}
              open={openPackages[packageName]}
              onOpenChange={(isOpen) => 
                setOpenPackages(prev => ({ ...prev, [packageName]: isOpen }))
              }
              className={`border rounded-lg p-4 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm ${
                isMaestroPackage ? 'border-primary/30 bg-gradient-to-r from-primary/5 to-transparent' : ''
              }`}
            >
              <CollapsibleTrigger className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  {isMaestroPackage ? (
                    <Crown className="h-5 w-5 text-primary" />
                  ) : (
                    <Package className="h-5 w-5 text-primary" />
                  )}
                  <h3 className="text-lg font-medium flex items-center gap-2">
                    {isMaestroPackage ? 'Maestro Exclusive Roles' : packageName}
                    {isMaestroPackage && (
                      <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        Premium
                      </span>
                    )}
                  </h3>
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
                      <TemplateRoleCard
                        role={role}
                        onUseTemplate={handleUseTemplate}
                        isPremium={isMaestroPackage}
                      />
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>

      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className="max-w-3xl">
          <UpgradeSubscriptionCard 
            variant="modal"
            showCreatorPlan={planType !== 'creator'}
            context="roles"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}