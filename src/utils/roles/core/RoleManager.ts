import { supabase } from "@/integrations/supabase/client";
import { Role, RoleValidationResult } from "../types/roles";
import { createMemoryContextManager } from "@/utils/memory/contextManager";

export class RoleManager {
  private roleId: string;
  private memoryManager: ReturnType<typeof createMemoryContextManager>;

  constructor(roleId: string) {
    this.roleId = roleId;
    this.memoryManager = createMemoryContextManager(roleId);
  }

  async getRoleDetails(): Promise<Role | null> {
    const { data, error } = await supabase
      .from("roles")
      .select("*")
      .eq("id", this.roleId)
      .single();

    if (error) throw error;
    return data;
  }

  async validateRole(): Promise<RoleValidationResult> {
    const role = await this.getRoleDetails();
    const errors: string[] = [];

    if (!role) {
      errors.push("Role not found");
      return { isValid: false, errors };
    }

    if (!role.name) errors.push("Role name is required");
    if (!role.tag) errors.push("Role tag is required");
    if (!role.instructions) errors.push("Role instructions are required");

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  async getCapabilities(): Promise<string[]> {
    const role = await this.getRoleDetails();
    return role?.special_capabilities || [];
  }

  async hasCapability(capability: string): Promise<boolean> {
    const capabilities = await this.getCapabilities();
    return capabilities.includes(capability);
  }

  async getMemories(content: string) {
    return await this.memoryManager.retrieveRelevantMemories(content);
  }

  async storeMemory(content: string, contextType: string, metadata: any = {}) {
    await this.memoryManager.storeMemoryWithContext(content, contextType, metadata);
  }
}

export const createRoleManager = (roleId: string) => {
  return new RoleManager(roleId);
};