import { Button } from "@/components/ui/button";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, Loader2, Wand2 } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import { RoleFormValues } from "../RoleForm";

type TagFieldProps = {
  form: UseFormReturn<RoleFormValues>;
  isGenerating: boolean;
  onGenerate: () => void;
};

export const TagField = ({ form, isGenerating, onGenerate }: TagFieldProps) => (
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
            onClick={onGenerate}
            disabled={isGenerating || !form.getValues('name')}
          >
            {isGenerating ? (
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
);