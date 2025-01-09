import * as MemoryMaintenance from "./memory/maintenance";
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
    await MemoryMaintenance.clearOldMemories(this.roleId, thirtyDaysAgo);
    await consolidateMemories(this.roleId);
    
    // Schedule periodic maintenance
    setInterval(async () => {
      await MemoryMaintenance.clearOldMemories(this.roleId, thirtyDaysAgo);
      await consolidateMemories(this.roleId);
    }, 24 * 60 * 60 * 1000); // Run daily
  }

  async storeMemory(content: string, contextType: string = 'conversation', topic?: string) {
    await MemoryStorage.storeMemory(this.roleId, content, contextType, topic);
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