import { supabase } from '@/integrations/supabase/client';
import { llongtermClient } from './LlongtermClient';

export class MindManager {
  async getMindForRole(roleId: string): Promise<string> {
    try {
      // Check if role already has a mind
      const { data: mindData, error: mindError } = await supabase
        .from('role_minds')
        .select('*')
        .eq('role_id', roleId)
        .single();

      if (mindError && mindError.code !== 'PGRST116') {
        throw mindError;
      }

      if (mindData?.mind_id) {
        return mindData.mind_id;
      }

      // If no mind exists, get role info and create one
      const { data: roleData, error: roleError } = await supabase
        .from('roles')
        .select('*')
        .eq('id', roleId)
        .single();

      if (roleError) throw roleError;
      if (!roleData) throw new Error('Role not found');

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
    } catch (error) {
      console.error('Error in getMindForRole:', error);
      throw error;
    }
  }

  async enrichRoleContext(roleId: string, context: string): Promise<void> {
    try {
      const mindId = await this.getMindForRole(roleId);
      await llongtermClient.enrichContext(mindId, context);
    } catch (error) {
      console.error('Error enriching role context:', error);
      throw error;
    }
  }

  async getRoleMemories(roleId: string, query: string) {
    try {
      const mindId = await this.getMindForRole(roleId);
      return await llongtermClient.getMindMemories(mindId, query);
    } catch (error) {
      console.error('Error getting role memories:', error);
      throw error;
    }
  }
}

export const mindManager = new MindManager();