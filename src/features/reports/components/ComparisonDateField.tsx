import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface ComparisonDateFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  linked?: boolean;
}

export function ComparisonDateField({
  id,
  label,
  value,
  onChange,
  linked,
}: ComparisonDateFieldProps) {
  return (
    <div className="space-y-1.5 min-w-0 box-border pr-2">
      <Label
        htmlFor={id}
        className="text-xs font-medium text-[#616161] dark:text-muted-foreground"
      >
        {label}
      </Label>
      <Input
        id={id}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-10 w-full min-w-0 rounded-lg border border-[#E0E0E0] bg-white px-3 text-sm shadow-none focus-visible:ring-2 focus-visible:ring-[#1976D2]/35 dark:border-border dark:bg-background [&::-webkit-calendar-picker-indicator]:opacity-100",
          linked && "opacity-80",
        )}
      />
    </div>
  );
}
