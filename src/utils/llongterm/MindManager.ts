import { supabase } from '@/integrations/supabase/client';
import { llongtermClient } from './LlongtermClient';

export class MindManager {
  async getMindForRole(roleId: string) {
    // Check if role already has a mind
    const { data: mindData } = await supabase
      .from('role_minds')
      .select('*')
      .eq('role_id', roleId)
      .single();

    if (mindData) {
      return mindData.mind_id;
    }

    // If no mind exists, get role info and create one
    const { data: roleData } = await supabase
      .from('roles')
      .select('*')
      .eq('id', roleId)
      .single();

    if (!roleData) {
      throw new Error('Role not found');
    }

    // Create new mind with role instructions
    const mindId = await llongtermClient.createMind(
      roleId,
      roleData.instructions,
      {
        name: roleData.name,
        expertise: roleData.expertise_areas,
        capabilities: roleData.special_capabilities
      }
    );

    return mindId;
  }

  async enrichRoleContext(roleId: string, context: string) {
    const mindId = await this.getMindForRole(roleId);
    return await llongtermClient.enrichContext(mindId, context);
  }

  async getRoleMemories(roleId: string, query: string) {
    const mindId = await this.getMindForRole(roleId);
    return await llongtermClient.getMindMemories(mindId, query);
  }
}

export const mindManager = new MindManager();