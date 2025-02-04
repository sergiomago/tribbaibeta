import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { UseFormReturn } from "react-hook-form";
import { RoleFormValues } from "../RoleForm";

type DescriptionFieldProps = {
  form: UseFormReturn<RoleFormValues>;
};

export const DescriptionField = ({ form }: DescriptionFieldProps) => (
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
);