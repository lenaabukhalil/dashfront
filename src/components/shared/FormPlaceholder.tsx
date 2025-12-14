import { Plus } from "lucide-react";

interface FormPlaceholderProps {
  title: string;
  description?: string;
}

export const FormPlaceholder = ({ title, description }: FormPlaceholderProps) => {
  return (
    <div className="bg-card rounded-2xl p-8 shadow-sm border border-border flex flex-col items-center justify-center min-h-[300px]">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Plus className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground text-center max-w-md">
        {description || "This form is coming soon. Please check back later."}
      </p>
    </div>
  );
};
