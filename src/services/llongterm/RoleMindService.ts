
import { supabase } from '@/lib/supabase';
import { mindService } from './MindService';
import type { CreateOptions, Mind } from 'llongterm';
import { LlongtermError } from '@/lib/llongterm/errors';

export class RoleMindService {
  async createMindForRole(roleId: string, options: CreateOptions): Promise<Mind> {
    try {
      // Update status to processing
      await this.updateMindStatus(roleId, 'processing');

      // Call the edge function with proper JSON payload
      const { data: mind, error } = await supabase.functions.invoke('create-role-mind', {
        body: JSON.stringify({ roleId }), // Make sure we're stringifying the body
        headers: {
          'Content-Type': 'application/json', // Explicitly set content type
        },
      });

      if (error) throw error;
      if (!mind) throw new Error('No response from mind creation service');

      // Store the association and configuration
      const { error: dbError } = await supabase
        .from('role_minds')
        .update({
          mind_id: mind.id,
          status: 'active',
          specialization: 'assistant',
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
          }
        })
        .eq('role_id', roleId);

      if (dbError) {
        // If database update fails, clean up the created mind
        console.error('Database error:', dbError);
        throw dbError;
      }

      return mind as Mind;
    } catch (error) {
      // Update status to failed with error message
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

  async updateMindStatus(roleId: string, status: string, errorMessage?: string): Promise<void> {
    await supabase.rpc('update_mind_status', {
      p_role_id: roleId,
      p_status: status,
      p_error_message: errorMessage
    });
  }
}

export const roleMindService = new RoleMindService();
