import { FileText, Image as ImageIcon, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface FilePreviewProps {
  fileMetadata: {
    file_path: string;
    file_name: string;
    content_type: string;
    size: number;
    file_id?: string;
  };
}

export function FilePreview({ fileMetadata }: FilePreviewProps) {
  const isImage = fileMetadata.content_type.startsWith('image/');
  
  const { data: analysisResult, isLoading: isAnalyzing } = useQuery({
    queryKey: ['file-analysis', fileMetadata.file_id],
    queryFn: async () => {
      if (!fileMetadata.file_id) return null;
      
      const { data, error } = await supabase
        .from('analyzed_files')
        .select('analysis_result, analysis_status')
        .eq('id', fileMetadata.file_id)
        .single();
        
      if (error) throw error;
      return data;
    },
    enabled: !!fileMetadata.file_id && !isImage,
    refetchInterval: (data) => 
      data?.analysis_status === 'processing' ? 2000 : false,
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
      
      {isAnalyzing && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Analyzing file...
        </div>
      )}
      
      {analysisResult?.analysis_result && (
        <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
          <p className="font-medium mb-1">Analysis:</p>
          <p>{analysisResult.analysis_result.content}</p>
        </div>
      )}
    </div>
  );
}