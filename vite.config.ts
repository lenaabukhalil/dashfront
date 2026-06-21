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

  return {
    server: {
      host: "::",
      port: 8080,
      proxy: {
        "/api": {
          target: apiProxyTarget,
          changeOrigin: true,
          timeout: 300000, // 5 min – تجنّب 504 من طرف الـ proxy عند استجابة الباك اند البطيئة
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
