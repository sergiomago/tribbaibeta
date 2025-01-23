import { createRoleCapabilityManager } from "./roles/core/RoleCapabilityManager";
import { createRoleMemoryManager } from "./roles/core/RoleMemoryManager";
import { createRoleInteractionManager } from "./roles/core/RoleInteractionManager";
import { SpecialCapability } from "./roles/types/roles";

// Special role capabilities
export const SPECIAL_CAPABILITIES = {
  WEB_SEARCH: 'web_search',
  DOC_ANALYSIS: 'doc_analysis'
} as const;

export class RoleManager {
  private capabilityManager: ReturnType<typeof createRoleCapabilityManager>;
  private memoryManager: ReturnType<typeof createRoleMemoryManager>;
  private interactionManager: ReturnType<typeof createRoleInteractionManager>;

  constructor(threadId: string) {
    this.capabilityManager = createRoleCapabilityManager(threadId);
    this.memoryManager = createRoleMemoryManager(threadId);
    this.interactionManager = createRoleInteractionManager(threadId);
  }

  // Capability methods
  async getAssignedRoles() {
    return await this.capabilityManager.getAssignedRoles();
  }

  async hasSpecialCapability(capability: SpecialCapability) {
    return await this.capabilityManager.hasSpecialCapability(capability);
  }

  async getRoleCapabilities(roleId: string) {
    return await this.capabilityManager.getRoleCapabilities(roleId);
  }

  // Memory methods
  async storeRoleMemory(roleId: string, content: string, contextType: string = 'conversation', metadata: any = {}) {
    return await this.memoryManager.storeRoleMemory(roleId, content, contextType, metadata);
  }

  async getRoleMemories(roleId: string, content: string) {
    return await this.memoryManager.getRoleMemories(roleId, content);
  }

  async updateMemoryRelevance(roleId: string, memoryId: string, relevanceScore: number) {
    return await this.memoryManager.updateMemoryRelevance(roleId, memoryId, relevanceScore);
  }

  // Interaction methods
  async getNextRespondingRole(currentOrder: number) {
    return await this.interactionManager.getNextRespondingRole(currentOrder);
  }

  async getConversationChain(taggedRoleId?: string) {
    return await this.interactionManager.getConversationChain(taggedRoleId);
  }
}

export const createRoleManager = (threadId: string) => {
  return new RoleManager(threadId);
};