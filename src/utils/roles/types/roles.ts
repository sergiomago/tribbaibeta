
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

// New type for role scoring to avoid full Role type requirement
export type RoleScoringData = Pick<Role, 'id' | 'name' | 'instructions' | 'tag' | 'model' | 'expertise_areas' | 'primary_topics'>;

export interface TaggingMetadata {
  role_name: string;
  role_tag: string;
  tagging_timestamp: string;
  special_capabilities: string[];
}

export interface MessageRelationship {
  id: string;
  parentMessageId: string;
  childMessageId: string;
  relationshipType: string;
  createdAt: string;
}
