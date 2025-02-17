
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form } from "@/components/ui/form";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { RoleNameField } from "./form/RoleNameField";
import { AliasField } from "./form/AliasField";
import { TagField } from "./form/TagField";
import { DescriptionField } from "./form/DescriptionField";
import { InstructionsField } from "./form/InstructionsField";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { SpecialCapabilitiesField } from "./form/SpecialCapabilitiesField";
import { SubmitButton } from "./form/SubmitButton";
import { useRoleFormSubmission } from "@/hooks/useRoleFormSubmission";

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
  const [isGenerating, setIsGenerating] = useState<Record<string, boolean>>({});
  const { planType, hasSubscription } = useSubscription();
  const [isInitializingMind, setIsInitializingMind] = useState(false);

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

  const { handleSubmit } = useRoleFormSubmission({
    form,
    onSubmit,
    defaultValues,
    setIsInitializingMind,
  });

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
      }
    } catch (error) {
      console.error(`Failed to generate ${type}:`, error);
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

        {isMaestroUser && <SpecialCapabilitiesField form={form} />}

        <SubmitButton 
          isCreating={isCreating}
          isInitializingMind={isInitializingMind}
          isUpdate={!!defaultValues}
        />
      </form>
    </Form>
  );
};
