/**
 * Current application version. Bump this on every user-facing release
 * along with the corresponding CHANGELOG entry.
 */
export const APP_VERSION = "0.4.1";

export interface ChangelogEntry {
  id: string;
  date: string; // ISO date string
  category: "feature" | "fix" | "improvement" | "security";
  title: string;
  description: string;
}

/** Entry ids are monotonic; bump `CHANGELOG[0].id` on each release so `ion_changelog_last_seen` updates. */
export const CHANGELOG: ChangelogEntry[] = [
  {
    id: "006",
    date: "2026-05-04",
    category: "security",
    title: "JWT Permission Enforcement",
    description:
      "All API endpoints now enforce JWT-based permission checks (R/RW) matching the RBAC matrix.",
  },
  {
    id: "007",
    date: "2026-05-04",
    category: "improvement",
    title: "Delete Wizard is now Archive Wizard",
    description:
      "The Delete Wizard has been renamed to Archive Wizard. Records are no longer hard-deleted — instead, every entity (Organizations, Locations, Chargers, Connectors, Tariffs, Users, RFID Users) now has is_deleted, deleted_at, and deleted_by columns with an index on is_deleted, so archived records are preserved and recoverable.",
  },
  {
    id: "008",
    date: "2026-05-04",
    category: "feature",
    title: "RFID User Access Scopes",
    description:
      "RFID Users now support access-scope-based permissions: Whole organization, Specific locations, or No access (suspend). This gives admins fine-grained control over where each RFID tag can charge.",
  },
];

export const CHANGELOG_LAST_SEEN_KEY = "ion_changelog_last_seen";

export function getLatestChangelogId(): string | undefined {
  return CHANGELOG[0]?.id;
}

export function getChangelogUnread(): boolean {
  const latest = getLatestChangelogId();
  if (!latest) return false;
  try {
    const seen = localStorage.getItem(CHANGELOG_LAST_SEEN_KEY);
    return seen !== latest;
  } catch {
    return true;
  }
}

export function markChangelogSeen(): void {
  const latest = getLatestChangelogId();
  if (!latest) return;
  try {
    localStorage.setItem(CHANGELOG_LAST_SEEN_KEY, latest);
  } catch {
    /* ignore */
  }
}
