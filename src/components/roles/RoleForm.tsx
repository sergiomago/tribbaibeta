import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Wand2, Info } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <FormLabel>Role</FormLabel>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Enter the primary role or function (e.g., 'Marketing Expert', 'Tech Lead')</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <FormControl>
                <Input 
                  placeholder="Enter the role title (e.g., 'Marketing Expert', 'Tech Lead')" 
                  {...field} 
                  onChange={(e) => {
                    field.onChange(e);
                    if (e.target.value) {
                      generateContent('tag');
                    }
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="alias"
          render={({ field }) => (
            <FormItem>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <FormLabel>Alias Name</FormLabel>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>A creative, personified version of the role (e.g., 'Mark Expert', 'Tech Leader')</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <div className="flex gap-2">
                <FormControl>
                  <Input placeholder="Enter a personified name for this role" {...field} />
                </FormControl>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => generateContent('alias')}
                  disabled={isGenerating.alias || !form.getValues('name')}
                >
                  {isGenerating.alias ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Wand2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="tag"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center gap-2">
                <FormLabel>Tag</FormLabel>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Tags (like @analyst) are used to call specific roles during team chats. For example, typing @analyst in a chat will specifically engage that role.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex gap-2">
                <FormControl>
                  <Input 
                    placeholder="Enter tag (e.g., @analyst)" 
                    {...field}
                    onChange={(e) => {
                      const value = e.target.value;
                      field.onChange(value.startsWith('@') ? value : `@${value}`);
                    }}
                  />
                </FormControl>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => generateContent('tag')}
                  disabled={isGenerating.tag || !form.getValues('name')}
                >
                  {isGenerating.tag ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Wand2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <FormLabel>Description</FormLabel>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Detailed overview of the role's expertise and responsibilities</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <FormControl>
                <Textarea
                  placeholder="Describe the role's expertise, main responsibilities, and key areas of knowledge. Be specific about what makes this role unique and valuable."
                  className="h-24"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="instructions"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Instructions</FormLabel>
              <div className="space-y-2">
                <FormControl>
                  <Textarea
                    placeholder={`Write instructions for your AI role. Consider:
• How should it interact? (friendly, professional, technical)
• What's its main purpose? (teach, guide, analyze)
• How should it handle different situations?
• What tone and style should it use?

Example: "Act as a friendly coding mentor who explains concepts clearly, uses relevant examples, and adapts to the user's skill level. Break down complex topics into simple steps and provide encouragement."`}
                    className="h-48 font-mono text-sm"
                    {...field}
                  />
                </FormControl>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => generateContent('instructions')}
                  disabled={isGenerating.instructions || !form.getValues('description')}
                >
                  {isGenerating.instructions ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating detailed instructions...
                    </>
                  ) : (
                    <>
                      <Wand2 className="mr-2 h-4 w-4" />
                      Generate from Description
                    </>
                  )}
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
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