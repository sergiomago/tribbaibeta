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

export const roleFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Role name is required"),
  alias: z.string().optional(),
  tag: z.string().min(1, "Tag is required"),
  description: z.string().min(1, "Description is required"),
  instructions: z.string().min(1, "Instructions are required"),
  model: z.enum(["gpt-4o", "gpt-4o-mini"]).default("gpt-4o"),
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

  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: defaultValues || {
      name: "",
      alias: "",
      tag: "",
      description: "",
      instructions: "",
      model: "gpt-4o",
    },
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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