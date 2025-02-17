
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { SPECIAL_CAPABILITIES } from "@/utils/RoleManager";
import { UseFormReturn } from "react-hook-form";
import { RoleFormValues } from "../RoleForm";

type SpecialCapabilitiesFieldProps = {
  form: UseFormReturn<RoleFormValues>;
};

export const SpecialCapabilitiesField = ({ form }: SpecialCapabilitiesFieldProps) => {
  return (
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
  );
};
