import { supabase } from "@/integrations/supabase/client";
import { Role } from "../types/roles";

export class TaggingSystem {
  private threadId: string;

  constructor(threadId: string) {
    this.threadId = threadId;
  }

  async findTaggedRole(content: string): Promise<Role | null> {
    const { data: threadRoles } = await supabase
      .from('thread_roles')
      .select('roles(*)')
      .eq('thread_id', this.threadId);

    if (!threadRoles?.length) return null;

    // Find role tags in the content
    const roleMatches = threadRoles
      .map(tr => tr.roles)
      .filter(role => {
        const tagPattern = new RegExp(`@${role.tag}\\b`, 'i');
        return tagPattern.test(content);
      });

    return roleMatches[0] || null;
  }

  async validateTagging(taggedRoleId: string): Promise<boolean> {
    const { data: role } = await supabase
      .from('thread_roles')
      .select('role_id')
      .eq('thread_id', this.threadId)
      .eq('role_id', taggedRoleId)
      .single();

    return !!role;
  }

  async getTaggingMetadata(taggedRoleId: string) {
    const { data: role } = await supabase
      .from('roles')
      .select('*')
      .eq('id', taggedRoleId)
      .single();

    if (!role) return null;

    return {
      role_name: role.name,
      role_tag: role.tag,
      tagging_timestamp: new Date().toISOString(),
      special_capabilities: role.special_capabilities || []
    };
  }
}

export const createTaggingSystem = (threadId: string) => {
  return new TaggingSystem(threadId);
};