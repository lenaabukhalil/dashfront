import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface LogoUploadProps {
  currentLogoUrl?: string;
  onUpload: (file: File) => Promise<void>;
  onRemove?: () => Promise<void>;
  disabled?: boolean;
}

export const LogoUpload = ({
  currentLogoUrl,
  onUpload,
  onRemove,
  disabled = false,
}: LogoUploadProps) => {
  const [preview, setPreview] = useState<string | null>(currentLogoUrl || null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB.",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    try {
      setUploading(true);
      await onUpload(file);
      toast({
        title: "Logo uploaded",
        description: "Logo has been uploaded successfully.",
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload logo.",
        variant: "destructive",
      });
      setPreview(currentLogoUrl || null);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!onRemove) return;
    try {
      await onRemove();
      setPreview(null);
      toast({
        title: "Logo removed",
        description: "Logo has been removed successfully.",
      });
    } catch (error) {
      toast({
        title: "Remove failed",
        description: error instanceof Error ? error.message : "Failed to remove logo.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <Label>Organization Logo</Label>
      
      {preview ? (
        <div className="relative inline-block">
          <div className="w-32 h-32 rounded-lg border-2 border-border overflow-hidden bg-muted">
            <img
              src={preview}
              alt="Logo preview"
              className="w-full h-full object-cover"
            />
          </div>
          {!disabled && onRemove && (
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
              onClick={handleRemove}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      ) : (
        <div className="w-32 h-32 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted">
          <ImageIcon className="w-8 h-8 text-muted-foreground" />
        </div>
      )}

      <div className="flex gap-2">
        <Label
          htmlFor="logo-upload"
          className="cursor-pointer"
        >
          <Input
            id="logo-upload"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={disabled || uploading}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            disabled={disabled || uploading}
            asChild
          >
            <span>
              <Upload className="w-4 h-4 mr-2" />
              {uploading ? "Uploading..." : preview ? "Change Logo" : "Upload Logo"}
            </span>
          </Button>
        </Label>
      </div>
      
      <p className="text-xs text-muted-foreground">
        Recommended: Square image, max 5MB (PNG, JPG, or SVG)
      </p>
    </div>
  );
};
