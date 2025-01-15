import { Button } from "@/components/ui/button";
import { Upload, Image } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface FileUploadButtonsProps {
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  onImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  isUploading: boolean;
}

export function FileUploadButtons({ onFileUpload, onImageUpload, isUploading }: FileUploadButtonsProps) {
  const isMobile = useIsMobile();

  return (
    <>
      <input
        type="file"
        accept=".pdf,.doc,.docx"
        className="hidden"
        id="file-upload"
        onChange={onFileUpload}
        disabled={isUploading}
      />
      <input
        type="file"
        accept="image/*"
        className="hidden"
        id="image-upload"
        onChange={onImageUpload}
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