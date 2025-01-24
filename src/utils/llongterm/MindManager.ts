import { supabase } from '@/integrations/supabase/client';
import { getLlongtermClient } from './client';

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

      // Create new mind using official SDK
      const client = getLlongtermClient();
      const { mindId } = await client.create({
        specialism: roleData.expertise_areas?.join(', '),
        specialismDepth: 3,
        customStructuredKeys: ['expertise', 'capabilities']
      });

      // Store mind association
      const { error: dbError } = await supabase
        .from('role_minds')
        .insert({
          role_id: roleId,
          mind_id: mindId,
          status: 'active',
          metadata: {
            expertise: roleData.expertise_areas,
            capabilities: roleData.special_capabilities
          }
        });

      if (dbError) throw dbError;
      return mindId;
    } catch (error) {
      console.error('Error in getMindForRole:', error);
      throw error;
    }
  }

  async updateMindStatus(roleId: string, status: "active" | "inactive" | "error"): Promise<void> {
    try {
      const { error } = await supabase
        .from('role_minds')
        .update({ status })
        .eq('role_id', roleId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating mind status:', error);
      throw error;
    }
  }

  async enrichRoleContext(roleId: string, context: string): Promise<void> {
    try {
      const mindId = await this.getMindForRole(roleId);
      const client = getLlongtermClient();
      await client.store({
        mindId,
        text: context
      });
    } catch (error) {
      console.error('Error enriching role context:', error);
      throw error;
    }
  }

  async getRoleMemories(roleId: string, query: string) {
    try {
      const mindId = await this.getMindForRole(roleId);
      const client = getLlongtermClient();
      return await client.query({
        mindId,
        text: query,
        limit: 5
      });
    } catch (error) {
      console.error('Error getting role memories:', error);
      throw error;
    }
  }
}

export const mindManager = new MindManager();