/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_AUTH_API_BASE_URL?: string;
  readonly VITE_RBAC_ADMIN_SECRET?: string;
  readonly VITE_API_PROXY_TARGET?: string;
  readonly VITE_GEOCODE_PROXY_TARGET?: string;
  readonly VITE_NOTIFICATIONS_PATH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
