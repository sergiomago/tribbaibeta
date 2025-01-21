import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { FileMetadata } from "@/types/fileAnalysis";

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