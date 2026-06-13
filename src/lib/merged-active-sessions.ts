import type { ActiveSession, LocalSession } from "@/services/api";

export type IonMergedSession = ActiveSession & { sourceType: "ion" };
export type LocalMergedSession = LocalSession & { sourceType: "local" };
export type MergedSession = IonMergedSession | LocalMergedSession;

function trimCoerced(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

export function parseStartDateTime(raw: string | number | null | undefined): Date {
  const s = trimCoerced(raw);
  if (s.includes("T")) return new Date(s);
  return new Date(s.replace(" ", "T") + "Z");
}

export function sessionStartTimeMs(session: { "Start Date/Time": string }): number {
  const rawStr = trimCoerced(session["Start Date/Time"]);
  if (!rawStr) return Number.NEGATIVE_INFINITY;
  const t = parseStartDateTime(rawStr).getTime();
  return Number.isFinite(t) ? t : Number.NEGATIVE_INFINITY;
}

export function formatSessionId(sessionId: string | number | null | undefined): string {
  if (sessionId === null || sessionId === undefined || String(sessionId).trim() === "") {
    return "-";
  }
  return String(sessionId);
}

export function mergeAndSortSessions(
  ion: ActiveSession[],
  local: LocalSession[],
): MergedSession[] {
  const ionRows: MergedSession[] = ion.map((session) => ({
    ...session,
    sourceType: "ion",
  }));
  const localRows: MergedSession[] = local.map((session) => ({
    ...session,
    sourceType: "local",
  }));
  return [...ionRows, ...localRows].sort(
    (a, b) => sessionStartTimeMs(b) - sessionStartTimeMs(a),
  );
}

export function mergedSessionKey(row: MergedSession): string {
  const sessionId = row["Session ID"];
  const id =
    sessionId != null && String(sessionId).trim() !== ""
      ? sessionId
      : row.sourceType === "local"
        ? row["User ID"]
        : sessionId;
  return `${row.sourceType}-${id ?? ""}-${trimCoerced(row["Start Date/Time"])}`;
}

export function mergedSessionUserLabel(session: MergedSession): string {
  if (session.sourceType === "ion") {
    return trimCoerced(session.mobile) || "-";
  }
  return trimCoerced(session["User ID"]) || "-";
}
