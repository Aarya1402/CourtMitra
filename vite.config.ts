import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
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
        target: "http://localhost:5000",
        changeOrigin: true,
      },
      "/ws": {
        target: "ws://localhost:5000",
        ws: true,
      },
    },
  },
});
