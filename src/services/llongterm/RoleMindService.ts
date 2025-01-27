import { supabase } from '@/lib/supabase';
import { mindService } from './MindService';
import type { CreateOptions, Mind } from 'llongterm';
import { LlongtermError } from '@/lib/llongterm/errors';

export class RoleMindService {
  async createMindForRole(roleId: string, options: CreateOptions): Promise<Mind> {
    try {
      // Update status to processing
      await this.updateMindStatus(roleId, 'processing');

      // Get role details for mind metadata
      const { data: role, error: roleError } = await supabase
        .from('roles')
        .select('name, description, tag, instructions')
        .eq('id', roleId)
        .single();

      if (roleError) throw new Error('Failed to fetch role details');

      // Create mind using Llongterm
      const mind = await mindService.createMind({
        ...options,
        metadata: {
          ...options.metadata,
          role_id: roleId,
          role_name: role.name,
          role_tag: role.tag,
          role_instructions: role.instructions,
          created_at: new Date().toISOString()
        }
      });

      // Store the association and update status
      const { error } = await supabase
        .from('role_minds')
        .update({
          mind_id: mind.id,
          status: 'active',
          updated_at: new Date().toISOString(),
          last_sync: new Date().toISOString(),
          metadata: {
            ...options.metadata,
            role_details: role
          }
        })
        .eq('role_id', roleId);

      if (error) {
        // If database update fails, clean up the created mind
        await mindService.deleteMind(mind.id);
        throw error;
      }

      return mind;
    } catch (error) {
      // Update status to failed with error message
      await this.updateMindStatus(roleId, 'failed', error.message);
      throw error;
    }
  }

  async getMindForRole(roleId: string): Promise<Mind | null> {
    const { data, error } = await supabase
      .from('role_minds')
      .select('mind_id, status')
      .eq('role_id', roleId)
      .eq('status', 'active')
      .single();

    if (error || !data?.mind_id) {
      return null;
    }

    try {
      return await mindService.getMind(data.mind_id);
    } catch (error) {
      // If mind retrieval fails, update status
      await this.updateMindStatus(roleId, 'failed', error.message);
      return null;
    }
  }

  async deleteMindForRole(roleId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('role_minds')
      .select('mind_id')
      .eq('role_id', roleId)
      .single();

    if (error || !data) {
      return false;
    }

    try {
      // Delete from Llongterm
      await mindService.deleteMind(data.mind_id);

      // Update database record
      await supabase
        .from('role_minds')
        .update({ 
          status: 'deleted',
          updated_at: new Date().toISOString()
        })
        .eq('role_id', roleId);

      return true;
    } catch (error) {
      await this.updateMindStatus(roleId, 'failed', error.message);
      return false;
    }
  }

  private async updateMindStatus(roleId: string, status: string, errorMessage?: string): Promise<void> {
    await supabase.rpc('update_mind_status', {
      p_role_id: roleId,
      p_status: status,
      p_error_message: errorMessage
    });
  }
}

export const roleMindService = new RoleMindService();