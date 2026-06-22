import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { normalizeMobile } from "@/lib/phone";

interface PartnerUserMobileFieldProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  countryCode?: number | string;
  placeholder?: string;
}

export function PartnerUserMobileField({
  id = "mobile",
  value,
  onChange,
  countryCode = 962,
  placeholder = "+962 79 000 0000",
}: PartnerUserMobileFieldProps) {
  const rawValue = typeof value === "string" ? value : value == null ? "" : String(value);
  const normalized = normalizeMobile(rawValue, countryCode);
  const hasInput = rawValue.trim().length > 0;
  const invalidLength = hasInput && (normalized.length < 8 || normalized.length > 12);

  return (
    <div className="space-y-1.5">
      <Input
        id={id}
        type="tel"
        inputMode="numeric"
        value={rawValue}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <p className="text-xs text-muted-foreground">
          Accepted formats: 780000001, 0780000001, +962780000001, 962780000001 — all stored as
          780000001
        </p>
        {hasInput && normalized ? (
          <Badge variant="secondary" className="shrink-0 text-xs font-normal">
            Will be saved as: {normalized}
          </Badge>
        ) : null}
      </div>
      {invalidLength ? (
        <p className="text-xs text-destructive">
          Mobile must be 8–12 digits after normalization (currently {normalized.length})
        </p>
      ) : null}
    </div>
  );
}
