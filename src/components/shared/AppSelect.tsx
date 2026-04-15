import React from "react";
import Select, { type StylesConfig } from "react-select";

export interface AppSelectOption {
  value: string;
  label: string;
}

export interface AppSelectProps {
  options: AppSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  isDisabled?: boolean;
  className?: string;
  /** Optional: use smaller height (e.g. for pagination) */
  size?: "sm" | "default";
  formatOptionLabel?: (option: AppSelectOption) => React.ReactNode;
}

const controlHeight = 40;
const controlHeightSm = 32;

/** Above Radix Dialog overlay/content (z-50 in Tailwind) */
const MENU_PORTAL_Z = 100000;

export function AppSelect({
  options,
  value,
  onChange,
  placeholder = "Select...",
  isDisabled = false,
  className = "",
  size = "default",
  formatOptionLabel,
}: AppSelectProps) {
  const height = size === "sm" ? controlHeightSm : controlHeight;

  const menuPortalTarget = typeof document !== "undefined" ? document.body : undefined;

  const styles: StylesConfig<AppSelectOption, false> = {
    control: (base, state) => ({
      ...base,
      minHeight: height,
      height: height,
      borderRadius: "6px",
      borderWidth: "1px",
      borderColor: state.isFocused ? "hsl(var(--ring))" : "hsl(var(--input))",
      borderStyle: "solid",
      backgroundColor: "hsl(var(--background))",
      "&:hover": {
        borderColor: state.isFocused ? "hsl(var(--ring))" : "hsl(var(--input))",
      },
      boxShadow: state.isFocused ? "0 0 0 2px hsl(var(--ring) / 0.2)" : "none",
    }),
    valueContainer: (base) => ({
      ...base,
      paddingLeft: "12px",
      paddingRight: "8px",
      height: height - 2,
    }),
    input: (base) => ({
      ...base,
      margin: 0,
      padding: 0,
      color: "hsl(var(--foreground))",
    }),
    placeholder: (base) => ({
      ...base,
      color: "hsl(var(--muted-foreground))",
    }),
    singleValue: (base) => ({
      ...base,
      color: "hsl(var(--foreground))",
    }),
    menu: (base) => ({
      ...base,
      zIndex: MENU_PORTAL_Z,
      backgroundColor: "hsl(var(--popover))",
      border: "1px solid hsl(var(--border))",
      borderRadius: "6px",
      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
    }),
    menuList: (base) => ({
      ...base,
      maxHeight: 200,
      overflowY: "auto",
    }),
    menuPortal: (base) => ({
      ...base,
      zIndex: MENU_PORTAL_Z,
      pointerEvents: "auto",
    }),
    option: (base, state) => ({
      ...base,
      fontSize: "14px",
      backgroundColor: state.isFocused ? "hsl(var(--accent))" : "transparent",
      color: state.isFocused ? "hsl(var(--accent-foreground))" : "hsl(var(--foreground))",
      cursor: "pointer",
      paddingTop: "6px",
      paddingBottom: "6px",
      paddingLeft: "12px",
      paddingRight: "12px",
    }),
    indicatorSeparator: () => ({ display: "none" }),
    dropdownIndicator: (base) => ({
      ...base,
      paddingLeft: "8px",
      paddingRight: "8px",
      color: "hsl(var(--muted-foreground))",
    }),
  };

  const selectedOption = options.find((opt) => opt.value === value) ?? null;

  return (
    <div className={className}>
      <Select<AppSelectOption, false>
        options={options}
        value={selectedOption}
        onChange={(option) => onChange(option?.value ?? "")}
        placeholder={placeholder}
        isDisabled={isDisabled}
        isSearchable
        isClearable={false}
        menuPortalTarget={menuPortalTarget}
        menuPosition="fixed"
        menuPlacement="auto"
        menuShouldBlockScroll
        menuShouldScrollIntoView={false}
        styles={styles}
        classNamePrefix="app-select"
        formatOptionLabel={formatOptionLabel}
      />
    </div>
  );
}
