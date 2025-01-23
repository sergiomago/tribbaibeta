import { supabase } from "@/integrations/supabase/client";
import { SpecialCapability } from "../types/roles";

export class RoleCapabilityManager {
  private threadId: string;

  constructor(threadId: string) {
    this.threadId = threadId;
  }

  async getAssignedRoles() {
    const { data: threadRoles, error } = await supabase
      .from("thread_roles")
      .select("role_id")
      .eq("thread_id", this.threadId);

    if (error) throw error;
    return threadRoles.map(tr => tr.role_id);
  }

  async hasSpecialCapability(capability: SpecialCapability) {
    const { data: threadRoles, error } = await supabase
      .from("thread_roles")
      .select(`
        role:roles (
          special_capabilities
        )
      `)
      .eq("thread_id", this.threadId);

    if (error) throw error;

    return threadRoles.some(tr => 
      tr.role?.special_capabilities?.includes(capability)
    );
  }

  async getRoleCapabilities(roleId: string) {
    const { data, error } = await supabase
      .from("roles")
      .select("special_capabilities")
      .eq("id", roleId)
      .single();

    if (error) throw error;
    return data?.special_capabilities || [];
  }
}

export const createRoleCapabilityManager = (threadId: string) => {
  return new RoleCapabilityManager(threadId);
};