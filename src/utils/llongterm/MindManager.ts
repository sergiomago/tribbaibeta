import { supabase } from "@/integrations/supabase/client";
import { getLlongtermClient } from './client';
import type { Mind, MindCreateOptions, LlongtermMessage, MindQueryResponse } from '@/types/llongterm';
import { toast } from '@/hooks/use-toast';

export class MindManager {
  private mindCache: Map<string, Mind> = new Map();
  private mindInitQueue: Map<string, Promise<Mind>> = new Map();

  private processRoleSpecialism(name: string, description: string, expertiseAreas: string[]): string {
    // Combine name and first sentence of description
    const firstSentence = description?.split('.')[0] || '';
    const baseSpecialism = `${name}: ${firstSentence}`;

    // Add expertise areas if available
    if (expertiseAreas && expertiseAreas.length > 0) {
      return `${baseSpecialism}. Expertise in: ${expertiseAreas.join(', ')}`;
    }

    return baseSpecialism;
  }

  private calculateSpecialismDepth(instructions: string, expertiseAreas: string[]): number {
    // Calculate depth based on complexity of role
    const hasDetailedInstructions = instructions?.length > 500;
    const hasMultipleExpertise = expertiseAreas?.length > 3;
    
    if (hasDetailedInstructions && hasMultipleExpertise) {
      return 4; // Maximum depth for complex roles
    } else if (hasDetailedInstructions || hasMultipleExpertise) {
      return 3; // Standard depth for moderately complex roles
    }
    return 2; // Base depth for simpler roles
  }

  private buildCustomStructuredKeys(
    expertiseAreas: string[],
    specialCapabilities: string[],
    primaryTopics: string[]
  ): string[] {
    const keys = new Set<string>();
    
    // Add all unique keys
    expertiseAreas?.forEach(area => keys.add(area));
    specialCapabilities?.forEach(cap => keys.add(cap));
    primaryTopics?.forEach(topic => keys.add(topic));

    return Array.from(keys);
  }

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
        await this.ensureMindInstance(mindData.mind_id);
        return mindData.mind_id;
      }

      // Get role data to create mind
      const { data: roleData, error: roleError } = await supabase
        .from('roles')
        .select('*')
        .eq('id', roleId)
        .single();

      if (roleError) throw roleError;
      if (!roleData) throw new Error('Role not found');

      // Process role data for mind creation
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

      // Create new mind using official SDK
      const client = getLlongtermClient();
      const options: MindCreateOptions = {
        specialism,
        specialismDepth,
        customStructuredKeys
      };

      const { mindId } = await client.create(options);
      await this.ensureMindInstance(mindId);

      // Store mind association with metadata
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

  clearCache() {
    this.mindCache.clear();
    this.mindInitQueue.clear();
  }
}

export const mindManager = new MindManager();