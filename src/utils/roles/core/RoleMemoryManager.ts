import { createMemoryContextManager } from "@/utils/memory/contextManager";

export class RoleMemoryManager {
  private threadId: string;
  private memoryContextManager: ReturnType<typeof createMemoryContextManager> | null = null;

  constructor(threadId: string) {
    this.threadId = threadId;
  }

  private getMemoryContextManager(roleId: string) {
    if (!this.memoryContextManager) {
      this.memoryContextManager = createMemoryContextManager(roleId);
    }
    return this.memoryContextManager;
  }

  async storeRoleMemory(roleId: string, content: string, contextType: string = 'conversation', metadata: any = {}) {
    const memoryManager = this.getMemoryContextManager(roleId);
    await memoryManager.storeMemoryWithContext(content, contextType, {
      ...metadata,
      thread_id: this.threadId
    });
  }

  async getRoleMemories(roleId: string, content: string) {
    const memoryManager = this.getMemoryContextManager(roleId);
    return await memoryManager.retrieveRelevantMemories(content);
  }

  async updateMemoryRelevance(roleId: string, memoryId: string, relevanceScore: number) {
    const memoryManager = this.getMemoryContextManager(roleId);
    await memoryManager.updateMemoryRelevance(memoryId, relevanceScore);
  }
}

export const createRoleMemoryManager = (threadId: string) => {
  return new RoleMemoryManager(threadId);
};