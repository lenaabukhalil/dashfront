import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export interface ExportButtonProps {
  onClick: () => void;
  disabled?: boolean;
  label?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
}

export function ExportButton({
  onClick,
  disabled = false,
  label = "Export CSV",
  variant = "outline",
}: ExportButtonProps) {
  return (
    <Button
      type="button"
      variant={variant}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
    >
      <Download className="h-4 w-4 mr-2" aria-hidden />
      {label}
    </Button>
  );
}
