import * as maintenance from "./memory/maintenance";
import { consolidateMemories } from "./memory/consolidation";
import { MemoryStorage } from "./memory/storage";
import { supabase } from "@/integrations/supabase/client";

export class LlongtermManager {
  private roleId: string;
  private threadId: string;
  private readonly SIMILARITY_THRESHOLD = 0.7;
  private readonly MAX_MEMORIES = 5;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private memoryCache: Map<string, { data: any; timestamp: number }> = new Map();

  constructor(roleId: string, threadId: string) {
    this.roleId = roleId;
    this.threadId = threadId;
    this.initializeAutomatedManagement();
  }

  private async initializeAutomatedManagement() {
    // Run initial cleanup
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    await maintenance.clearOldMemories(this.roleId, thirtyDaysAgo);
    await consolidateMemories(this.roleId);
    
    // Schedule periodic maintenance
    setInterval(async () => {
      await maintenance.clearOldMemories(this.roleId, thirtyDaysAgo);
      await consolidateMemories(this.roleId);
    }, 24 * 60 * 60 * 1000); // Run daily
  }

  async storeInteractionMemory(
    initiatorRoleId: string,
    responderRoleId: string,
    content: string,
    effectiveness: number
  ) {
    const metadata = {
      interaction_type: 'role_conversation',
      initiator_role_id: initiatorRoleId,
      responder_role_id: responderRoleId,
      effectiveness_score: effectiveness,
      timestamp: Date.now(),
      thread_id: this.threadId
    };

    // Store memory with metadata in the content
    const enrichedContent = JSON.stringify({
      content,
      metadata
    });

    await MemoryStorage.storeMemory(
      this.roleId,
      enrichedContent,
      'interaction'
    );

    // Update role interaction metrics in the database
    await supabase.from('role_interactions').insert({
      initiator_role_id: initiatorRoleId,
      responder_role_id: responderRoleId,
      thread_id: this.threadId,
      interaction_type: 'conversation',
      effectiveness_score: effectiveness,
      metadata: metadata
    });

    // Clear cache when new memory is stored
    this.memoryCache.clear();
  }

  async getInteractionMemories(roleId: string, context: string) {
    const cacheKey = `interaction-${roleId}-${context}`;
    const cachedResult = this.memoryCache.get(cacheKey);
    
    if (cachedResult && Date.now() - cachedResult.timestamp < this.CACHE_DURATION) {
      console.log('Retrieved interaction memories from cache');
      return cachedResult.data;
    }

    try {
      const { data: memories, error } = await supabase.rpc(
        'get_similar_memories',
        {
          p_embedding: context,
          p_match_threshold: this.SIMILARITY_THRESHOLD,
          p_match_count: this.MAX_MEMORIES,
          p_role_id: roleId
        }
      );

      if (error) throw error;

      // Cache the results
      this.memoryCache.set(cacheKey, {
        data: memories,
        timestamp: Date.now()
      });

      console.log(`Retrieved ${memories?.length || 0} interaction memories`);
      return memories;
    } catch (error) {
      console.error('Error retrieving interaction memories:', error);
      throw error;
    }
  }

  async storeMemory(content: string, contextType: string = 'conversation') {
    await MemoryStorage.storeMemory(this.roleId, content, contextType);
    // Clear cache when new memory is stored
    this.memoryCache.clear();
  }

  async getMemories(content: string) {
    const cacheKey = `${this.roleId}-${content}`;
    const cachedResult = this.memoryCache.get(cacheKey);
    
    if (cachedResult && Date.now() - cachedResult.timestamp < this.CACHE_DURATION) {
      console.log('Retrieved memories from cache');
      return cachedResult.data;
    }

    try {
      const { data: memories, error } = await supabase.rpc(
        'get_similar_memories',
        {
          p_embedding: content,
          p_match_threshold: this.SIMILARITY_THRESHOLD,
          p_match_count: this.MAX_MEMORIES,
          p_role_id: this.roleId
        }
      );

      if (error) throw error;

      // Cache the results
      this.memoryCache.set(cacheKey, {
        data: memories,
        timestamp: Date.now()
      });

      console.log(`Retrieved ${memories?.length || 0} memories from database`);
      return memories;
    } catch (error) {
      console.error('Error retrieving memories:', error);
      throw error;
    }
  }

  async updateMemoryInteractions(memoryIds: string[]) {
    await MemoryStorage.updateMemoryInteractions(memoryIds);
    // Clear cache after updating interactions
    this.memoryCache.clear();
  }
}

export const createLlongtermManager = (roleId: string, threadId: string) => {
  return new LlongtermManager(roleId, threadId);
};