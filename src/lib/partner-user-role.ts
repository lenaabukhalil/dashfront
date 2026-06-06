/** Display label for partner/dashboard users: prefer API role_name, then role_code. */
export function partnerUserRoleLabel(
  u: { role_name?: string | null; role_code?: string | null } | null | undefined
): string {
  if (!u) return "—";
  const name = String(u.role_name ?? "").trim();
  if (name) return name;
  const code = String(u.role_code ?? "").trim();
  if (code) return code;
  return "—";
}
