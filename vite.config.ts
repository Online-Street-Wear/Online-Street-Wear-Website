import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: true,
    watch: {
      ignored: ["**/.data/**", "**/.wrangler/**"],
    },
    proxy: {
      "/api": {
        target: "http://localhost:8789",
        changeOrigin: true,
        xfwd: true,
        timeout: 30000,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 5000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
