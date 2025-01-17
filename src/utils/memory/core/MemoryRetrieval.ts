import { supabase } from "@/integrations/supabase/client";
import { DatabaseMemory } from "../types/memory";

export class MemoryRetrieval {
  private roleId: string;

  constructor(roleId: string) {
    this.roleId = roleId;
  }

  async getByCategory(category: string, limit: number = 10): Promise<DatabaseMemory[]> {
    try {
      const { data, error } = await supabase
        .from('role_memories')
        .select('*')
        .eq('role_id', this.roleId)
        .eq('memory_category', category)
        .order('importance_score', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error retrieving memories by category:', error);
      throw error;
    }
  }

  async getByContextType(contextType: string, limit: number = 10): Promise<DatabaseMemory[]> {
    try {
      const { data, error } = await supabase
        .from('role_memories')
        .select('*')
        .eq('role_id', this.roleId)
        .eq('context_type', contextType)
        .order('context_relevance', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error retrieving memories by context type:', error);
      throw error;
    }
  }

  async getMostRelevant(limit: number = 5): Promise<DatabaseMemory[]> {
    try {
      const { data, error } = await supabase
        .from('role_memories')
        .select('*')
        .eq('role_id', this.roleId)
        .order('relevance_score', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error retrieving most relevant memories:', error);
      throw error;
    }
  }
}