import { Role } from "../types/roles";
import { supabase } from "@/integrations/supabase/client";
import { RelevanceScorer } from "./RelevanceScoring";

export class RoleSelector {
  private threadId: string;
  private relevanceScorer: RelevanceScorer;

  constructor(threadId: string) {
    this.threadId = threadId;
    this.relevanceScorer = new RelevanceScorer();
  }

  async getAvailableRoles(): Promise<Role[]> {
    const { data: threadRoles, error } = await supabase
      .from('thread_roles')
      .select('role:roles(*)')
      .eq('thread_id', this.threadId);

    if (error) throw error;
    return threadRoles.map(tr => tr.role);
  }

  async selectResponders(content: string): Promise<Role[]> {
    const roles = await this.getAvailableRoles();
    const scoredRoles = await Promise.all(
      roles.map(async (role) => ({
        role,
        score: await this.relevanceScorer.calculateScore(role, content, this.threadId)
      }))
    );

    return scoredRoles
      .sort((a, b) => b.score - a.score)
      .map(sr => sr.role);
  }

  async selectTaggedRole(taggedRoleId: string): Promise<Role | null> {
    const { data: role, error } = await supabase
      .from('roles')
      .select('*')
      .eq('id', taggedRoleId)
      .single();

    if (error) throw error;
    return role;
  }
}

export const createRoleSelector = (threadId: string) => {
  return new RoleSelector(threadId);
};