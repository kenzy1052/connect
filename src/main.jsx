import * as Sentry from "@sentry/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async"; // ← add
import "./index.css";
import App from "./App.jsx";
import { ToastProvider } from "./context/ToastContext";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  enabled: import.meta.env.PROD,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  integrations: [Sentry.replayIntegration()],
});

// ── PWA auto-refresh ────────────────────────────────────────────────────────
// When the service worker activates a new version, it posts NEW_CONTENT.
// We reload the page so users always see fresh content without manual refresh.
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});

  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data?.type === "NEW_CONTENT") {
      // Small delay to let the SW finish claiming, then reload
      setTimeout(() => window.location.reload(), 300);
    }
  });
}

const root = createRoot(document.getElementById("root"));

root.render(
  <StrictMode>
    <HelmetProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </HelmetProvider>
  </StrictMode>,
);
