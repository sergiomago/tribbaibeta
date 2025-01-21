import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FileMetadata, FileAnalysis } from "@/types/fileAnalysis";
import { ImagePreview } from "./preview/ImagePreview";
import { DocumentPreview } from "./preview/DocumentPreview";
import { AnalysisDisplay } from "./preview/AnalysisDisplay";

interface FilePreviewProps {
  fileMetadata: FileMetadata;
}

export function FilePreview({ fileMetadata }: FilePreviewProps) {
  const isImage = fileMetadata.content_type.startsWith('image/');
  
  const { data: analysisData, isLoading: isAnalyzing } = useQuery({
    queryKey: ['file-analysis', fileMetadata.file_id],
    queryFn: async () => {
      if (!fileMetadata.file_id) {
        return null;
      }
      
      const { data, error } = await supabase
        .from('analyzed_files')
        .select('*')
        .eq('id', fileMetadata.file_id)
        .maybeSingle();
        
      if (error) throw error;
      
      return data as FileAnalysis | null;
    },
    enabled: !!fileMetadata.file_id && !isImage,
    refetchInterval: (data) => 
      data?.analysis_status === 'processing' || data?.analysis_status === 'pending' ? 2000 : false,
  });

  return (
    <div className="space-y-2 max-w-md">
      {isImage ? (
        <ImagePreview fileMetadata={fileMetadata} />
      ) : (
        <>
          <DocumentPreview fileMetadata={fileMetadata} />
          <AnalysisDisplay analysis={analysisData} isAnalyzing={isAnalyzing} />
        </>
      )}
    </div>
  );
}