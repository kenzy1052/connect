import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/**
 * VitePWA is intentionally removed.
 *
 * We use a hand-written service worker at /public/sw.js which handles:
 *   - Web Push background notifications (RFC 8291 aes128gcm)
 *   - Notification click routing
 *   - Basic offline shell cache
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
  },
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        // Manual code-splitting logic for Vite 8 / Rolldown
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("react-dom") || id.includes("react/")) {
              return "vendor-react";
            }
            if (id.includes("react-router-dom")) {
              return "vendor-router";
            }
            if (id.includes("@supabase")) {
              return "vendor-supabase";
            }
            if (id.includes("lucide-react") || id.includes("framer-motion")) {
              return "vendor-ui";
            }
            // Fallback for other dependencies
            return "vendor";
          }
        },
      },
    },
  },
});
