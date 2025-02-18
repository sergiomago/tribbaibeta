
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { UseFormReturn } from "react-hook-form";
import { RoleFormValues } from "../RoleForm";

type RoleNameFieldProps = {
  form: UseFormReturn<RoleFormValues>;
};

export const RoleNameField = ({ form }: RoleNameFieldProps) => (
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
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
);
