import { supabase } from '@/lib/supabase';
import { mindService } from './MindService';
import type { CreateOptions, Mind } from 'llongterm';

export class RoleMindService {
  async createMindForRole(roleId: string, options: CreateOptions): Promise<Mind> {
    // Create mind using Llongterm
    const mind = await mindService.createMind(options);

    // Store the association in the database
    const { error } = await supabase
      .from('role_minds')
      .insert({
        role_id: roleId,
        mind_id: mind.id,
        status: 'active',
        metadata: JSON.stringify(options.metadata || {})
      });

    if (error) {
      // If database insertion fails, clean up the created mind
      await mindService.deleteMind(mind.id);
      throw error;
    }

    return mind;
  }

  async getMindForRole(roleId: string): Promise<Mind | null> {
    const { data, error } = await supabase
      .from('role_minds')
      .select('mind_id')
      .eq('role_id', roleId)
      .eq('status', 'active')
      .single();

    if (error || !data) {
      return null;
    }

    return await mindService.getMind(data.mind_id);
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

    // Delete from Llongterm
    await mindService.deleteMind(data.mind_id);

    // Update database record
    await supabase
      .from('role_minds')
      .update({ status: 'deleted' })
      .eq('role_id', roleId);

    return true;
  }
}

export const roleMindService = new RoleMindService();