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
 *
 * VitePWA's "generateSW" mode produces its own /sw.js via Workbox,
 * overwriting our custom file and breaking the push handler.
 * The PWA install criteria (manifest + SW + HTTPS) are met without
 * the plugin; all manifest metadata lives in /public/manifest.json
 * and /index.html meta tags.
 *
 * If you want Workbox pre-caching in the future, switch to the
 * "injectManifest" strategy in VitePWA and add:
 *   precacheAndRoute(self.__WB_MANIFEST || [])
 * to the top of public/sw.js.
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
  },
  build: {
    // Bump chunk size warning — router lazy splits keep initial bundle lean
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        // Manual code-splitting for vendor chunks
        manualChunks: {
          "vendor-react": ["react", "react-dom"],
          "vendor-router": ["react-router-dom"],
          "vendor-supabase": ["@supabase/supabase-js"],
          "vendor-ui": ["lucide-react", "framer-motion"],
        },
      },
    },
  },
});
