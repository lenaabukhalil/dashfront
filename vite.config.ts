import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import pkg from "./package.json";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiProxyTarget =
    env.VITE_API_PROXY_TARGET ||
    env.VITE_GEOCODE_PROXY_TARGET ||
    "http://localhost:3001";

  // NEW: derive ws(s) target from http(s) target  →  e.g. wss://dash.evse.cloud
  const wsProxyTarget = apiProxyTarget.replace(/^http/i, "ws");

  return {
    server: {
      host: "::",
      port: 8080,
      proxy: {
        "/api": {
          target: apiProxyTarget,
          changeOrigin: true,
          timeout: 300000, // 5 min – avoid proxy 504 when the backend responds slowly
        },
        // NEW: WebSocket proxy for /ws/notifications (and any future /ws/* paths)
        "/ws": {
          target: wsProxyTarget,
          ws: true,           // critical: tells Vite to handle WS upgrade
          changeOrigin: true,
        },
      },
    },
    plugins: [react()],

    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
    },

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
