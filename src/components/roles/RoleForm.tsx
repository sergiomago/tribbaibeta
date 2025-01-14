import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { RoleNameField } from "./form/RoleNameField";
import { AliasField } from "./form/AliasField";
import { TagField } from "./form/TagField";
import { DescriptionField } from "./form/DescriptionField";
import { InstructionsField } from "./form/InstructionsField";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { SPECIAL_CAPABILITIES } from "@/utils/RoleManager";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export const roleFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Role name is required"),
  alias: z.string().optional(),
  tag: z.string().min(1, "Tag is required"),
  description: z.string().min(1, "Description is required"),
  instructions: z.string().min(1, "Instructions are required"),
  model: z.enum(["gpt-4o", "gpt-4o-mini"]).default("gpt-4o-mini"),
  special_capabilities: z.array(z.string()).default([]),
});

export type RoleFormValues = z.infer<typeof roleFormSchema>;

type RoleFormProps = {
  onSubmit: (values: RoleFormValues) => void;
  isCreating: boolean;
  defaultValues?: RoleFormValues;
};

export const RoleForm = ({ onSubmit, isCreating, defaultValues }: RoleFormProps) => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState<Record<string, boolean>>({});
  const { planType, hasSubscription } = useSubscription();

  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: defaultValues || {
      name: "",
      alias: "",
      tag: "",
      description: "",
      instructions: "",
      model: "gpt-4o-mini",
      special_capabilities: [],
    },
  });

  const handleSubmit = async (values: RoleFormValues) => {
    // Check role limits for Creator plan
    if (!defaultValues?.id && planType === 'creator') {
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

    // Check special capabilities access
    if (values.special_capabilities.length > 0 && (!hasSubscription || planType !== 'maestro')) {
      toast({
        title: "Special Capabilities Not Available",
        description: "Special capabilities are only available with the Maestro plan. Please upgrade to access these features.",
        variant: "destructive",
      });
      return;
    }

    // Check model access
    if (values.model === "gpt-4o" && (!hasSubscription || planType !== 'maestro')) {
      toast({
        title: "Model Not Available",
        description: "GPT-4 is only available with the Maestro plan. Please upgrade to access this model.",
        variant: "destructive",
      });
      return;
    }

    onSubmit(values);
  };

  const generateContent = async (type: 'tag' | 'alias' | 'instructions') => {
    try {
      setIsGenerating({ ...isGenerating, [type]: true });
      const { name, description } = form.getValues();

      const { data, error } = await supabase.functions.invoke('generate-role-content', {
        body: { type, name, description },
      });

      if (error) throw error;

      if (data.content) {
        form.setValue(type, data.content, { shouldValidate: true });
        toast({
          title: "Success",
          description: `Generated ${type} successfully`,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to generate ${type}: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsGenerating({ ...isGenerating, [type]: false });
    }
  };

  const isMaestroUser = hasSubscription && planType === 'maestro';

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <RoleNameField 
          form={form} 
          onNameChange={() => generateContent('tag')} 
        />
        
        <AliasField 
          form={form} 
          isGenerating={isGenerating.alias} 
          onGenerate={() => generateContent('alias')} 
        />
        
        <TagField 
          form={form} 
          isGenerating={isGenerating.tag} 
          onGenerate={() => generateContent('tag')} 
        />
        
        <DescriptionField form={form} />
        
        <InstructionsField 
          form={form} 
          isGenerating={isGenerating.instructions} 
          onGenerate={() => generateContent('instructions')} 
        />

        {isMaestroUser && (
          <div className="space-y-4">
            <Label>Special Capabilities</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="web_search"
                  checked={form.watch("special_capabilities").includes(SPECIAL_CAPABILITIES.WEB_SEARCH)}
                  onCheckedChange={(checked) => {
                    const current = form.watch("special_capabilities");
                    if (checked) {
                      form.setValue("special_capabilities", [...current, SPECIAL_CAPABILITIES.WEB_SEARCH]);
                    } else {
                      form.setValue("special_capabilities", current.filter(c => c !== SPECIAL_CAPABILITIES.WEB_SEARCH));
                    }
                  }}
                />
                <Label htmlFor="web_search">Web Search</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="doc_analysis"
                  checked={form.watch("special_capabilities").includes(SPECIAL_CAPABILITIES.DOC_ANALYSIS)}
                  onCheckedChange={(checked) => {
                    const current = form.watch("special_capabilities");
                    if (checked) {
                      form.setValue("special_capabilities", [...current, SPECIAL_CAPABILITIES.DOC_ANALYSIS]);
                    } else {
                      form.setValue("special_capabilities", current.filter(c => c !== SPECIAL_CAPABILITIES.DOC_ANALYSIS));
                    }
                  }}
                />
                <Label htmlFor="doc_analysis">Document Analysis</Label>
              </div>
            </div>
          </div>
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={isCreating}
        >
          {isCreating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : defaultValues ? "Update Role" : "Create Role"}
        </Button>
      </form>
    </Form>
  );
};