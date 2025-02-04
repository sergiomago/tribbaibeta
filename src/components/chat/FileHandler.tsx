import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface FileHandlerProps {
  onFileUpload: (file: File) => Promise<void>;
}

export function FileHandler({ onFileUpload }: FileHandlerProps) {
  const { toast } = useToast();

  const validateFile = (file: File, type: 'document' | 'image') => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error('File size must be less than 10MB');
    }

    if (type === 'document') {
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Only PDF and Word documents are allowed');
      }
    } else {
      if (!file.type.startsWith('image/')) {
        throw new Error('Only image files are allowed');
      }
    }
  };

  const triggerFileAnalysis = async (fileId: string) => {
    try {
      const { error } = await supabase.functions.invoke('analyze-file', {
        body: { fileId }
      });

      if (error) throw error;

      console.log('File analysis triggered successfully');
    } catch (error) {
      console.error('Error triggering file analysis:', error);
      toast({
        title: "Analysis failed",
        description: "Failed to analyze file. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'document' | 'image') => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      validateFile(file, type);
      await onFileUpload(file);

      // Get the latest uploaded file for this user
      const { data: fileData, error: fileError } = await supabase
        .from('analyzed_files')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (fileError) throw fileError;

      // Trigger analysis for documents
      if (type === 'document' && fileData?.id) {
        await triggerFileAnalysis(fileData.id);
      }

    } catch (error) {
      console.error(`Error uploading ${type}:`, error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : `Failed to upload ${type}. Please try again.`,
        variant: "destructive",
      });
    } finally {
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  return { handleFileUpload };
}