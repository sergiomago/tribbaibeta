import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface FileUploadHandlerProps {
  threadId: string;
  onFileUploaded?: () => void;
}

export function useFileUploadHandler({ threadId, onFileUploaded }: FileUploadHandlerProps) {
  const { toast } = useToast();

  const uploadFile = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('threadId', threadId);

      const { error } = await supabase.functions.invoke("upload-file", {
        body: formData,
      });

      if (error) throw error;

      toast({
        title: "File uploaded",
        description: "Your file has been uploaded successfully.",
      });
      
      onFileUploaded?.();
      return true;
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload file. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  return { uploadFile };
}