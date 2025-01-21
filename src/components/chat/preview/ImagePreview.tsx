import { FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FileMetadata } from "@/types/fileAnalysis";
import { supabase } from "@/integrations/supabase/client";

interface ImagePreviewProps {
  fileMetadata: FileMetadata;
}

export function ImagePreview({ fileMetadata }: ImagePreviewProps) {
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
    <div className="space-y-2">
      <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
        <img
          src={`${supabase.storageUrl}/object/public/analysis_files/${fileMetadata.file_path}`}
          alt={fileMetadata.file_name}
          className="object-contain w-full h-full"
        />
      </div>
      <div className="flex items-center justify-between p-2 rounded-lg border bg-muted/50">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{fileMetadata.file_name}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={handleDownload}>
          <Download className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}