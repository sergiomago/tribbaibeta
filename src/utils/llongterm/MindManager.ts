import { supabase } from "@/integrations/supabase/client";
import { getLlongtermClient } from './client';
import type { Mind, MindCreateOptions, LlongtermMessage, MindQueryResponse } from '@/types/llongterm';
import { toast } from '@/hooks/use-toast';

export class MindManager {
  private mindCache: Map<string, Mind> = new Map();
  private mindInitQueue: Map<string, Promise<Mind>> = new Map();

  private processRoleSpecialism(name: string, description: string, expertiseAreas: string[]): string {
    const firstSentence = description?.split('.')[0] || '';
    const baseSpecialism = `${name}: ${firstSentence}`;

    if (expertiseAreas && expertiseAreas.length > 0) {
      return `${baseSpecialism}. Expertise in: ${expertiseAreas.join(', ')}`;
    }

    return baseSpecialism;
  }

  private calculateSpecialismDepth(instructions: string, expertiseAreas: string[]): number {
    const hasDetailedInstructions = instructions?.length > 500;
    const hasMultipleExpertise = expertiseAreas?.length > 3;
    
    if (hasDetailedInstructions && hasMultipleExpertise) {
      return 4;
    } else if (hasDetailedInstructions || hasMultipleExpertise) {
      return 3;
    }
    return 2;
  }

  private buildCustomStructuredKeys(
    expertiseAreas: string[],
    specialCapabilities: string[],
    primaryTopics: string[]
  ): string[] {
    const keys = new Set<string>();
    
    expertiseAreas?.forEach(area => keys.add(area));
    specialCapabilities?.forEach(cap => keys.add(cap));
    primaryTopics?.forEach(topic => keys.add(topic));

    return Array.from(keys);
  }

  async getMindForRole(roleId: string): Promise<string> {
    try {
      const { data: mindData, error: mindError } = await supabase
        .from('role_minds')
        .select('*')
        .eq('role_id', roleId)
        .single();

      if (mindError && mindError.code !== 'PGRST116') {
        throw mindError;
      }

      if (mindData?.mind_id) {
        await this.ensureMindInstance(mindData.mind_id);
        return mindData.mind_id;
      }

      const { data: roleData, error: roleError } = await supabase
        .from('roles')
        .select('*')
        .eq('id', roleId)
        .single();

      if (roleError) throw roleError;
      if (!roleData) throw new Error('Role not found');

      const specialism = this.processRoleSpecialism(
        roleData.name,
        roleData.description || '',
        roleData.expertise_areas || []
      );

      const specialismDepth = this.calculateSpecialismDepth(
        roleData.instructions,
        roleData.expertise_areas || []
      );

      const customStructuredKeys = this.buildCustomStructuredKeys(
        roleData.expertise_areas || [],
        roleData.special_capabilities || [],
        roleData.primary_topics || []
      );

      const client = getLlongtermClient();
      const options: MindCreateOptions = {
        specialism,
        specialismDepth,
        customStructuredKeys
      };

      const { mindId } = await client.create(options);
      await this.ensureMindInstance(mindId);

      const { error: dbError } = await supabase
        .from('role_minds')
        .insert({
          role_id: roleId,
          mind_id: mindId,
          status: 'active',
          metadata: {
            specialism,
            expertise: roleData.expertise_areas,
            capabilities: roleData.special_capabilities,
            creation_date: new Date().toISOString()
          }
        });

      if (dbError) throw dbError;
      
      toast({
        title: "Mind Created",
        description: `Successfully created mind for role: ${roleData.name}`,
      });

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
    if (this.mindCache.has(mindId)) {
      return this.mindCache.get(mindId)!;
    }

    if (this.mindInitQueue.has(mindId)) {
      return await this.mindInitQueue.get(mindId)!;
    }

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

  async enrichRoleContext(roleId: string, content: string): Promise<void> {
    console.log('Mind context enrichment not yet implemented', { roleId, content });
  }

  async getRoleMemories(roleId: string, query: string): Promise<MindQueryResponse> {
    console.log('Mind memory retrieval not yet implemented', { roleId, query });
    return {
      results: [],
      metadata: {
        totalResults: 0,
        processingTime: 0
      }
    };
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

  clearCache() {
    this.mindCache.clear();
    this.mindInitQueue.clear();
  }
}

export const mindManager = new MindManager();
