import { Button } from "@/components/ui/button";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Wand2 } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import { RoleFormValues } from "../RoleForm";

type InstructionsFieldProps = {
  form: UseFormReturn<RoleFormValues>;
  isGenerating: boolean;
  onGenerate: () => void;
};

export const InstructionsField = ({ form, isGenerating, onGenerate }: InstructionsFieldProps) => (
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
            onClick={onGenerate}
            disabled={isGenerating || !form.getValues('description')}
          >
            {isGenerating ? (
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
);