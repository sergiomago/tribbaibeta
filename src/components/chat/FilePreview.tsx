import { FileText, Image as ImageIcon, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Database } from "@/integrations/supabase/types";

type AnalyzedFile = Database['public']['Tables']['analyzed_files']['Row'];

interface FileMetadata {
  file_path: string;
  file_name: string;
  content_type: string;
  size: number;
  file_id?: string;
}

interface FilePreviewProps {
  fileMetadata: FileMetadata;
}

export function FilePreview({ fileMetadata }: FilePreviewProps) {
  const isImage = fileMetadata.content_type.startsWith('image/');
  
  const { data: analysisData, isLoading: isAnalyzing } = useQuery<AnalyzedFile | null>({
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
      
      return data;
    },
    enabled: !!fileMetadata.file_id && !isImage,
    refetchInterval: (data) => 
      data?.analysis_status === 'processing' || data?.analysis_status === 'pending' ? 2000 : false,
  });
  
  const handleDownload = async () => {
    try {
      const { data, error } = await supabase.storage
        .from('analysis_files')
        .download(fileMetadata.file_path);
        
      if (error) throw error;
      
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileMetadata.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  if (isImage) {
    return (
      <div className="relative group max-w-md">
        <img
          src={`${supabase.storage.from('analysis_files').getPublicUrl(fileMetadata.file_path).data.publicUrl}`}
          alt={fileMetadata.file_name}
          className="rounded-lg max-w-full h-auto"
        />
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleDownload}
            className="bg-background/80 backdrop-blur-sm"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-w-md">
      <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/50">
        <FileText className="h-8 w-8 text-muted-foreground" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{fileMetadata.file_name}</p>
          <p className="text-xs text-muted-foreground">
            {(fileMetadata.size / 1024 / 1024).toFixed(2)} MB
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleDownload}>
          <Download className="h-4 w-4" />
        </Button>
      </div>
      
      {(isAnalyzing || analysisData?.analysis_status === 'processing') && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Analyzing file...
        </div>
      )}
      
      {analysisData?.analysis_status === 'failed' && (
        <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
          Analysis failed. Please try again.
        </div>
      )}
      
      {analysisData?.analysis_result && analysisData.analysis_status === 'completed' && (
        <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
          <p className="font-medium mb-1">Analysis:</p>
          <p>{typeof analysisData.analysis_result === 'object' && analysisData.analysis_result !== null ? 
              analysisData.analysis_result.content : 
              String(analysisData.analysis_result)}</p>
          {typeof analysisData.analysis_result === 'object' && 
           analysisData.analysis_result !== null && 
           'analyzed_at' in analysisData.analysis_result && (
            <p className="text-xs mt-2 text-muted-foreground">
              Analyzed at: {new Date(analysisData.analysis_result.analyzed_at as string).toLocaleString()}
            </p>
          )}
        </div>
      )}
    </div>
  );
}