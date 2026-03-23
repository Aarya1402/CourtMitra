import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react()],
    optimizeDeps: {
      include: ["lamejs"],
    },
    server: {
      host: "0.0.0.0",
      port: 5173,
      allowedHosts: true,
      proxy: {
        "/sarvam-api": {
          target: "https://api.sarvam.ai",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/sarvam-api/, ""),
        },
        "/sarvam-blob": {
          target: "https://appsprodpublicsa.blob.core.windows.net",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/sarvam-blob/, ""),
        },
        "/api": {
          target: env.VITE_API_BASE_URL || "http://localhost:5000",
          changeOrigin: true,
        },
        "/ws": {
          target: env.VITE_WS_BASE_URL || "http://localhost:5000",
          ws: true,
        },
      },
    },
  };
});
