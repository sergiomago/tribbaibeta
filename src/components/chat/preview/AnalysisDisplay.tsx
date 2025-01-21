import { Loader2 } from "lucide-react";
import { FileAnalysis, isAnalysisResult } from "@/types/fileAnalysis";

interface AnalysisDisplayProps {
  analysis: FileAnalysis | null;
  isAnalyzing: boolean;
}

export function AnalysisDisplay({ analysis, isAnalyzing }: AnalysisDisplayProps) {
  if (isAnalyzing || analysis?.analysis_status === 'processing') {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Analyzing file...
      </div>
    );
  }

  if (analysis?.analysis_status === 'failed') {
    return (
      <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
        Analysis failed. Please try again.
      </div>
    );
  }

  if (analysis?.analysis_result && analysis.analysis_status === 'completed') {
    return (
      <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
        <p className="font-medium mb-1">Analysis:</p>
        <p>
          {isAnalysisResult(analysis.analysis_result) ? 
            analysis.analysis_result.content : 
            String(analysis.analysis_result)}
        </p>
        {isAnalysisResult(analysis.analysis_result) && 
         analysis.analysis_result.analyzed_at && (
          <p className="text-xs mt-2 text-muted-foreground">
            Analyzed at: {new Date(analysis.analysis_result.analyzed_at).toLocaleString()}
          </p>
        )}
      </div>
    );
  }

  return null;
}