import type { PartnerUserRecord } from "@/services/api";

export function resolvePartnerUserId(u: PartnerUserRecord): number | null {
  const raw = u.user_id ?? (u as { id?: number }).id;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function partnerUserRowKey(u: PartnerUserRecord, index: number): string {
  const id = resolvePartnerUserId(u);
  if (id != null) {
    return `user-${id}`;
  }
  const org = u.organization_id ?? "na";
  const mobile = String(u.mobile ?? "").trim();
  if (mobile) return `org-${org}-mobile-${mobile}`;
  return `row-${index}`;
}
