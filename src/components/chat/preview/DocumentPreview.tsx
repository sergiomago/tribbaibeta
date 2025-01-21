import { FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FileMetadata } from "@/types/fileAnalysis";
import { supabase } from "@/integrations/supabase/client";

interface DocumentPreviewProps {
  fileMetadata: FileMetadata;
}

export function DocumentPreview({ fileMetadata }: DocumentPreviewProps) {
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

  return (
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
  );
}