import { Json } from "@/integrations/supabase/types";

export type AnalysisStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface FileMetadata {
  file_path: string;
  file_name: string;
  content_type: string;
  size: number;
  file_id?: string;
}

export interface AnalysisResult {
  content: string;
  analyzed_at?: string;
}

export interface FileAnalysis {
  id: string;
  analysis_status: AnalysisStatus;
  analysis_result: AnalysisResult | null;
  file_metadata: FileMetadata;
}

export function isAnalysisResult(value: unknown): value is AnalysisResult {
  if (!value || typeof value !== 'object') return false;
  return 'content' in value && typeof (value as AnalysisResult).content === 'string';
}