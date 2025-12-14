import { FileText } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  description?: string;
}

export const EmptyState = ({ 
  title = "No data available", 
  description 
}: EmptyStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <FileText className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground text-center max-w-md">
          {description}
        </p>
      )}
    </div>
  );
};
