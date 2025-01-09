import { MemoryMaintenance } from "./memory/maintenance";
import { MemoryConsolidation } from "./memory/consolidation";
import { MemoryStorage } from "./memory/storage";

export class LlongtermManager {
  private roleId: string;
  private threadId: string;

  constructor(roleId: string, threadId: string) {
    this.roleId = roleId;
    this.threadId = threadId;
    this.initializeAutomatedManagement();
  }

  private async initializeAutomatedManagement() {
    // Run initial cleanup
    await MemoryMaintenance.pruneExpiredMemories(this.roleId);
    await MemoryConsolidation.consolidateMemories(this.roleId);
    
    // Schedule periodic maintenance
    setInterval(async () => {
      await MemoryMaintenance.pruneExpiredMemories(this.roleId);
      await MemoryConsolidation.consolidateMemories(this.roleId);
    }, 24 * 60 * 60 * 1000); // Run daily
  }

  async storeMemory(content: string, contextType: string = 'conversation', topic?: string) {
    await MemoryStorage.storeMemory(this.roleId, content, contextType, topic);
  }

  async updateMemoryInteractions(memoryIds: string[]) {
    await MemoryStorage.updateMemoryInteractions(memoryIds);
  }
}

export const createLlongtermManager = (roleId: string, threadId: string) => {
  return new LlongtermManager(roleId, threadId);
};