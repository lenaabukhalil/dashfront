import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { normalizeToInternational } from "@/lib/phone";

interface OrgContactPhoneFieldProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}

export function OrgContactPhoneField({
  id = "contact_phoneNumber",
  value,
  onChange,
  required,
}: OrgContactPhoneFieldProps) {
  const rawValue = typeof value === "string" ? value : value == null ? "" : String(value);
  const normalized = normalizeToInternational(rawValue);
  const hasInput = rawValue.trim().length > 0;
  const invalidLength = hasInput && (normalized.length < 12 || normalized.length > 16);

  return (
    <div className="space-y-1.5">
      <Input
        id={id}
        type="tel"
        inputMode="tel"
        value={rawValue}
        onChange={(e) => onChange(e.target.value)}
        placeholder="+962 79 000 0000"
        required={required}
      />
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <p className="text-xs text-muted-foreground">
          Accepted formats: 780000001, 0780000001, +962780000001, 962780000001 — all stored as
          +962780000001
        </p>
        {hasInput && normalized ? (
          <Badge variant="secondary" className="shrink-0 text-xs font-normal">
            Will be saved as: {normalized}
          </Badge>
        ) : null}
      </div>
      {invalidLength ? (
        <p className="text-xs text-destructive">
          Phone must be 12–16 characters in international format (currently {normalized.length})
        </p>
      ) : null}
    </div>
  );
}
