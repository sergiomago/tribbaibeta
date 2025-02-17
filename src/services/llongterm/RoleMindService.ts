
import { supabase } from '@/lib/supabase';
import { llongtermClient } from '@/lib/llongterm/client';
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
        .select('name, description, tag, instructions, expertise_areas, special_capabilities')
        .eq('id', roleId)
        .single();

      if (roleError) throw new Error('Failed to fetch role details');

      // Create mind directly using the client
      const mind = await llongtermClient.createMind({
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

      // Store the association and configuration
      const { error: dbError } = await supabase
        .from('role_minds')
        .update({
          mind_id: mind.id,
          status: 'active',
          specialization: this.determineSpecialization(role.special_capabilities),
          specialization_depth: 2,
          memory_configuration: {
            contextWindow: 10,
            maxMemories: 100,
            relevanceThreshold: 0.7
          },
          updated_at: new Date().toISOString(),
          last_sync: new Date().toISOString(),
          metadata: {
            ...options.metadata,
            role_details: role
          }
        })
        .eq('role_id', roleId);

      if (dbError) {
        console.error('Database error:', dbError);
        // Attempt to clean up the mind if database update fails
        try {
          await llongtermClient.deleteMind(mind.id);
        } catch (cleanupError) {
          console.error('Failed to cleanup mind after database error:', cleanupError);
        }
        throw dbError;
      }

      return mind;
    } catch (error) {
      console.error('Error in createMindForRole:', error);
      await this.updateMindStatus(roleId, 'failed', error.message);
      throw error;
    }
  }

  private determineSpecialization(capabilities?: string[]): 'general' | 'analyst' | 'researcher' | 'expert' | 'assistant' {
    if (!capabilities || capabilities.length === 0) return 'assistant';
    
    if (capabilities.includes('analysis')) return 'analyst';
    if (capabilities.includes('research')) return 'researcher';
    if (capabilities.includes('expert_knowledge')) return 'expert';
    
    return 'general';
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
      return await llongtermClient.getMind(data.mind_id);
    } catch (error) {
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
      await llongtermClient.deleteMind(data.mind_id);

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

  async updateMindStatus(roleId: string, status: string, errorMessage?: string): Promise<void> {
    await supabase.rpc('update_mind_status', {
      p_role_id: roleId,
      p_status: status,
      p_error_message: errorMessage
    });
  }
}

export const roleMindService = new RoleMindService();
