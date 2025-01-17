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