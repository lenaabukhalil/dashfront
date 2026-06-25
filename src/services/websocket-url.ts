/**
 * Resolve the REST API base URL used to derive the notifications WebSocket endpoint.
 */
function resolveApiBaseUrl(): string {
  const envBase = import.meta.env.VITE_API_BASE_URL;
  if (envBase != null && String(envBase).trim() !== "") {
    return String(envBase).trim();
  }
  return `${window.location.origin}/api`;
}

/**
 * Build `ws(s)://<host>/ws/notifications` from the configured API base URL.
 *
 * - `http://` → `ws://`, `https://` → `wss://`
 * - Trailing `/api` (case-insensitive) is stripped before appending `/ws/notifications`
 * - Relative bases (e.g. `/api` in dev) are resolved against `window.location.origin`
 * - Missing protocol defaults to `wss:` when the page is served over HTTPS, else `http:`
 */
export function getNotificationsWebSocketUrl(): string {
  let base = resolveApiBaseUrl();

  if (base.startsWith("/")) {
    base = `${window.location.origin}${base}`;
  }

  if (!/^https?:\/\//i.test(base)) {
    const defaultProto = window.location.protocol === "https:" ? "https:" : "http:";
    base = `${defaultProto}//${base.replace(/^\/\//, "")}`;
  }

  base = base.replace(/\/+$/, "");
  base = base.replace(/\/api$/i, "");

  const wsBase = base.replace(/^http:/i, "ws:").replace(/^https:/i, "wss:");
  return `${wsBase}/ws/notifications`;
}
