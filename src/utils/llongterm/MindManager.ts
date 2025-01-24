import { supabase } from '@/integrations/supabase/client';
import { getLlongtermClient } from './client';
import type { Mind, MindCreateOptions, LlongtermMessage } from '@/types/llongterm';

export class MindManager {
  private mindCache: Map<string, Mind> = new Map();

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
        // Initialize mind instance if not in cache
        if (!this.mindCache.has(mindData.mind_id)) {
          const client = getLlongtermClient();
          const mind = await client.getMind(mindData.mind_id);
          this.mindCache.set(mindData.mind_id, mind);
        }
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
      const options: MindCreateOptions = {
        specialism: roleData.expertise_areas?.join(', '),
        specialismDepth: 3,
        customStructuredKeys: ['expertise', 'capabilities']
      };

      const { mindId } = await client.create(options);
      const mind = await client.getMind(mindId);
      this.mindCache.set(mindId, mind);

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
      const mind = this.mindCache.get(mindId);
      
      if (!mind) {
        throw new Error('Mind not found in cache');
      }

      const message: LlongtermMessage = {
        author: 'system',
        message: context,
        timestamp: new Date().toISOString()
      };

      await mind.remember([message]);
    } catch (error) {
      console.error('Error enriching role context:', error);
      throw error;
    }
  }

  async getRoleMemories(roleId: string, query: string) {
    try {
      const mindId = await this.getMindForRole(roleId);
      const mind = this.mindCache.get(mindId);
      
      if (!mind) {
        throw new Error('Mind not found in cache');
      }

      return await mind.ask(query);
    } catch (error) {
      console.error('Error getting role memories:', error);
      throw error;
    }
  }

  clearCache() {
    this.mindCache.clear();
  }
}

export const mindManager = new MindManager();