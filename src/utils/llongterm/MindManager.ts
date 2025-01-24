import { supabase } from '@/integrations/supabase/client';
import { getLlongtermClient } from './client';
import type { Mind, MindCreateOptions, LlongtermMessage, MindQueryResponse } from '@/types/llongterm';
import { toast } from '@/hooks/use-toast';

export class MindManager {
  private mindCache: Map<string, Mind> = new Map();
  private mindInitQueue: Map<string, Promise<Mind>> = new Map();

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
        await this.ensureMindInstance(mindData.mind_id);
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
      await this.ensureMindInstance(mindId);

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
      toast({
        title: "Error Creating Mind",
        description: error instanceof Error ? error.message : "Failed to create mind for role",
        variant: "destructive"
      });
      throw error;
    }
  }

  private async ensureMindInstance(mindId: string): Promise<Mind> {
    // Check cache first
    if (this.mindCache.has(mindId)) {
      return this.mindCache.get(mindId)!;
    }

    // Check if initialization is in progress
    if (this.mindInitQueue.has(mindId)) {
      return await this.mindInitQueue.get(mindId)!;
    }

    // Initialize new mind instance
    const initPromise = this.initializeMind(mindId);
    this.mindInitQueue.set(mindId, initPromise);

    try {
      const mind = await initPromise;
      this.mindCache.set(mindId, mind);
      return mind;
    } finally {
      this.mindInitQueue.delete(mindId);
    }
  }

  private async initializeMind(mindId: string): Promise<Mind> {
    try {
      const client = getLlongtermClient();
      return await client.getMind(mindId);
    } catch (error) {
      console.error('Error initializing mind:', error);
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
      const mind = await this.ensureMindInstance(mindId);
      
      const message: LlongtermMessage = {
        author: 'system',
        message: context,
        timestamp: new Date().toISOString()
      };

      await mind.remember([message]);
    } catch (error) {
      console.error('Error enriching role context:', error);
      toast({
        title: "Error Enriching Context",
        description: "Failed to update role's context",
        variant: "destructive"
      });
      throw error;
    }
  }

  async getRoleMemories(roleId: string, query: string): Promise<MindQueryResponse> {
    try {
      const mindId = await this.getMindForRole(roleId);
      const mind = await this.ensureMindInstance(mindId);
      return await mind.ask(query);
    } catch (error) {
      console.error('Error getting role memories:', error);
      toast({
        title: "Error Retrieving Memories",
        description: "Failed to retrieve role memories",
        variant: "destructive"
      });
      throw error;
    }
  }

  clearCache() {
    this.mindCache.clear();
    this.mindInitQueue.clear();
  }
}

export const mindManager = new MindManager();