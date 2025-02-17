
import { supabase } from '@/lib/supabase';
import { llongterm } from '@/lib/llongterm/client';
import type { CreateOptions, Mind } from 'llongterm';
import { LlongtermError } from '@/lib/llongterm/errors';

export class RoleMindService {
  // Made this public so it can be used by useRoleMind
  async updateMindStatus(roleId: string, status: string, errorMessage?: string): Promise<void> {
    await supabase
      .from('roles')
      .update({
        mind_status: status,
        mind_error: errorMessage,
        updated_at: new Date().toISOString()
      })
      .eq('id', roleId);
  }

  async createMindForRole(roleId: string, options: CreateOptions): Promise<Mind> {
    try {
      // Get role details for mind metadata
      const { data: role, error: roleError } = await supabase
        .from('roles')
        .select('name, description, tag, instructions, expertise_areas, special_capabilities')
        .eq('id', roleId)
        .single();

      if (roleError) throw new Error('Failed to fetch role details');

      // Create mind using SDK
      const mind = await llongterm.minds.create({
        specialism: role.name,
        specialismDepth: 2,
        metadata: {
          roleId,
          name: role.name,
          description: role.description,
          tag: role.tag,
          instructions: role.instructions,
          expertiseAreas: role.expertise_areas,
          specialCapabilities: role.special_capabilities,
          ...options.metadata
        }
      });

      // Update role with mind_id
      const { error: updateError } = await supabase
        .from('roles')
        .update({
          mind_id: mind.id,
          mind_status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', roleId);

      if (updateError) {
        // Rollback - delete the mind if database update fails
        await llongterm.minds.delete(mind.id);
        throw updateError;
      }

      return mind;
    } catch (error) {
      // Update role status on error
      await this.updateMindStatus(roleId, 'failed', error.message);
      throw error;
    }
  }

  async getMindForRole(roleId: string): Promise<Mind | null> {
    const { data, error } = await supabase
      .from('roles')
      .select('mind_id, mind_status')
      .eq('id', roleId)
      .single();

    if (error || !data?.mind_id) {
      return null;
    }

    try {
      return await llongterm.minds.get(data.mind_id);
    } catch (error) {
      await this.updateMindStatus(roleId, 'failed', error.message);
      return null;
    }
  }

  async deleteMindForRole(roleId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('roles')
      .select('mind_id')
      .eq('id', roleId)
      .single();

    if (error || !data?.mind_id) {
      return false;
    }

    try {
      await llongterm.minds.delete(data.mind_id);

      await supabase
        .from('roles')
        .update({ 
          mind_status: 'deleted',
          updated_at: new Date().toISOString()
        })
        .eq('id', roleId);

      return true;
    } catch (error) {
      await this.updateMindStatus(roleId, 'failed', error.message);
      return false;
    }
  }
}

export const roleMindService = new RoleMindService();
