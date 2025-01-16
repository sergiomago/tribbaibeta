import { useToast } from "@/hooks/use-toast";

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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'document' | 'image') => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      validateFile(file, type);
      await onFileUpload(file);
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