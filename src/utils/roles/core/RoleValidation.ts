import { Role, RoleValidationResult } from "../types/roles";
import { supabase } from "@/integrations/supabase/client";

export class RoleValidator {
  static async validateRoleCreation(role: Partial<Role>): Promise<RoleValidationResult> {
    const errors: string[] = [];

    // Basic validation
    if (!role.name) errors.push("Role name is required");
    if (!role.tag) errors.push("Role tag is required");
    if (!role.instructions) errors.push("Role instructions are required");

    // Check for duplicate tag
    if (role.tag) {
      const { data: existingRole } = await supabase
        .from("roles")
        .select("id")
        .eq("tag", role.tag)
        .single();

      if (existingRole) {
        errors.push("Tag is already in use");
      }
    }

    // Validate special capabilities
    if (role.special_capabilities && role.special_capabilities.length > 0) {
      const validCapabilities = ["web_search", "doc_analysis"];
      const invalidCapabilities = role.special_capabilities.filter(
        cap => !validCapabilities.includes(cap)
      );

      if (invalidCapabilities.length > 0) {
        errors.push(`Invalid capabilities: ${invalidCapabilities.join(", ")}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateRoleUpdate(role: Partial<Role>): RoleValidationResult {
    const errors: string[] = [];

    if (role.name === "") errors.push("Role name cannot be empty");
    if (role.tag === "") errors.push("Role tag cannot be empty");
    if (role.instructions === "") errors.push("Role instructions cannot be empty");

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}