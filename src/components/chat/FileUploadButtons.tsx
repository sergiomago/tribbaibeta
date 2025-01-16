import { Button } from "@/components/ui/button";
import { Upload, Image } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";

interface FileUploadButtonsProps {
  threadId: string;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  onImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  isUploading: boolean;
}

export function FileUploadButtons({ threadId, onFileUpload, onImageUpload, isUploading }: FileUploadButtonsProps) {
  const isMobile = useIsMobile();
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('threadId', threadId);

    await onFileUpload(event);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('threadId', threadId);

    await onImageUpload(event);
  };

  return (
    <>
      <input
        type="file"
        accept=".pdf,.doc,.docx"
        className="hidden"
        id="file-upload"
        onChange={handleFileUpload}
        disabled={isUploading}
      />
      <input
        type="file"
        accept="image/*"
        className="hidden"
        id="image-upload"
        onChange={handleImageUpload}
        disabled={isUploading}
      />
      <Button 
        variant="outline" 
        size={isMobile ? "sm" : "default"}
        onClick={() => document.getElementById('file-upload')?.click()}
        className="shrink-0"
        disabled={isUploading}
      >
        <Upload className="h-4 w-4" />
        {!isMobile && <span className="ml-2">
          {isUploading ? "Uploading..." : "Upload File"}
        </span>}
      </Button>
      <Button 
        variant="outline"
        size={isMobile ? "sm" : "default"}
        onClick={() => document.getElementById('image-upload')?.click()}
        className="shrink-0"
        disabled={isUploading}
      >
        <Image className="h-4 w-4" />
        {!isMobile && <span className="ml-2">
          {isUploading ? "Uploading..." : "Upload Image"}
        </span>}
      </Button>
    </>
  );
}