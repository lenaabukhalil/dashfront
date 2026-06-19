export const PARTNER_USER_TYPE_VALUES = [
  "admin",
  "manager",
  "engineer",
  "operator",
  "accountant",
] as const;

export type PartnerUserType = (typeof PARTNER_USER_TYPE_VALUES)[number];

export const PARTNER_USER_TYPES: ReadonlyArray<{ value: PartnerUserType; label: string }> = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "engineer", label: "Engineer" },
  { value: "operator", label: "Operator" },
  { value: "accountant", label: "Accountant" },
];

export function validPartnerUserType(v: string | null | undefined): PartnerUserType {
  if (v && PARTNER_USER_TYPE_VALUES.includes(v as PartnerUserType)) {
    return v as PartnerUserType;
  }
  return "operator";
}
