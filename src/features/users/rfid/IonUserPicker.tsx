import { useEffect, useRef, useState } from "react";
import { Loader2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/contexts/LanguageContext";
import { useChargingUsers } from "@/features/users/hooks/useChargingUsers";
import { userInitials } from "@/features/users/live-activity/liveActivityShared";
import { cn } from "@/lib/utils";

export type IonUserPickerUser = {
  user_id: number;
  first_name: string;
  last_name: string;
  mobile: string;
};

interface IonUserPickerProps {
  value: number | null;
  onChange: (userId: number | null, user?: IonUserPickerUser | null) => void;
  disabled?: boolean;
  /** Prefill chip label when editing an existing link (before search picks a user). */
  displayUser?: IonUserPickerUser | null;
}

export function IonUserPicker({ value, onChange, disabled, displayUser }: IonUserPickerProps) {
  const { dir } = useLanguage();
  const { rows, loading, search, setSearch, activeQuery } = useChargingUsers();
  const [showSearch, setShowSearch] = useState(false);
  const [pickedUser, setPickedUser] = useState<IonUserPickerUser | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const chipUser =
    value != null
      ? pickedUser?.user_id === value
        ? pickedUser
        : displayUser?.user_id === value
          ? displayUser
          : pickedUser
      : null;

  const showDropdown =
    dropdownOpen &&
    !disabled &&
    (showSearch || value == null) &&
    activeQuery != null &&
    search.trim().length >= 2;

  useEffect(() => {
    if (value == null) {
      setPickedUser(null);
      setShowSearch(false);
    }
  }, [value]);

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  const handlePick = (user: IonUserPickerUser) => {
    setPickedUser(user);
    onChange(user.user_id, user);
    setDropdownOpen(false);
    setShowSearch(false);
    setSearch("");
  };

  const handleUnlink = () => {
    setPickedUser(null);
    onChange(null, null);
    setShowSearch(false);
    setSearch("");
  };

  if (value != null && chipUser && !showSearch) {
    const name =
      [chipUser.first_name, chipUser.last_name].filter(Boolean).join(" ").trim() || "—";
    return (
      <div ref={rootRef} className="space-y-2" dir={dir}>
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
          <div
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary"
            aria-hidden
          >
            {userInitials(chipUser)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground truncate">{name}</p>
            <p className="text-xs text-muted-foreground tabular-nums">ID #{chipUser.user_id}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 shrink-0 text-muted-foreground hover:text-destructive"
            disabled={disabled}
            onClick={handleUnlink}
          >
            <X className="size-3.5 me-1" aria-hidden />
            Unlink
          </Button>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs"
          disabled={disabled}
          onClick={() => setShowSearch(true)}
        >
          Change
        </Button>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative space-y-1" dir={dir}>
      <div className="relative">
        <Search
          className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          value={search}
          disabled={disabled}
          placeholder="Search ION user by name or mobile…"
          className="ps-9"
          onChange={(e) => {
            setSearch(e.target.value);
            setDropdownOpen(true);
          }}
          onFocus={() => setDropdownOpen(true)}
          autoComplete="off"
        />
      </div>
      {showDropdown ? (
        <div
          className={cn(
            "absolute z-50 mt-1 w-full max-h-[240px] overflow-y-auto rounded-md border border-border bg-popover shadow-md",
          )}
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Loading…
            </div>
          ) : rows.length === 0 ? (
            <p className="px-3 py-4 text-sm text-muted-foreground text-center">No matching users.</p>
          ) : (
            <ul className="py-1">
              {rows.map((user) => {
                const name =
                  [user.first_name, user.last_name].filter(Boolean).join(" ").trim() || "—";
                return (
                  <li key={user.user_id}>
                    <button
                      type="button"
                      className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-start hover:bg-muted/60 transition-colors"
                      onClick={() =>
                        handlePick({
                          user_id: user.user_id,
                          first_name: user.first_name,
                          last_name: user.last_name,
                          mobile: String(user.mobile ?? ""),
                        })
                      }
                    >
                      <span className="text-sm font-medium text-foreground">{name}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {String(user.mobile ?? "").trim() || "—"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
