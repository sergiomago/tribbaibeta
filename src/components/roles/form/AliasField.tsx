import { Button } from "@/components/ui/button";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Loader2, Wand2 } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import { RoleFormValues } from "../RoleForm";

type AliasFieldProps = {
  form: UseFormReturn<RoleFormValues>;
  isGenerating: boolean;
  onGenerate: () => void;
};

export const AliasField = ({ form, isGenerating, onGenerate }: AliasFieldProps) => (
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