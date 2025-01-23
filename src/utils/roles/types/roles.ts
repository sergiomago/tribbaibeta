import { Tables } from "@/integrations/supabase/types";

export type Role = Tables<"roles">;

export interface RoleCapability {
  id: string;
  name: string;
  description: string;
  isEnabled: boolean;
}

export interface RoleValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface RoleSelectionCriteria {
  contextRelevance: number;
  interactionHistory: number;
  specialCapabilities: string[];
  requiredTags?: string[];
}

export interface RoleInteraction {
  id: string;
  initiatorRoleId: string;
  responderRoleId: string;
  threadId: string;
  interactionType: string;
  metadata: Record<string, any>;
  conversationDepth: number;
  createdAt: string;
}

export interface TaggingMetadata {
  role_name: string;
  role_tag: string;
  tagging_timestamp: string;
  special_capabilities: string[];
}

// Add the missing SpecialCapability type
export type SpecialCapability = 'web_search' | 'doc_analysis';