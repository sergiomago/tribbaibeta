
export interface DomainAnalysis {
  name: string;
  confidence: number;
  requiredExpertise: string[];
}

export interface AnalysisResult {
  intent: string;
  domains: DomainAnalysis[];
  urgency: number;
}

export interface RoleScore {
  roleId: string;
  score: number;
}
