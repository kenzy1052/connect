import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

/**
 * Shows a lightweight error toast without needing the React context.
 * Used only in non-component code (e.g. session expiry handler).
 */
function showNativeError(message) {
  const el = document.createElement("div");
  el.textContent = message;
  Object.assign(el.style, {
    position: "fixed",
    bottom: "24px",
    left: "50%",
    transform: "translateX(-50%)",
    background: "hsl(var(--surface, 30 30 30))",
    color: "hsl(var(--danger, 0 72% 65%))",
    border: "1px solid hsl(var(--danger, 0 72% 65%) / 0.4)",
    padding: "11px 20px",
    borderRadius: "10px",
    fontSize: "14px",
    fontWeight: "500",
    zIndex: "9999",
    boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
    animation: "fadeIn 0.2s ease",
  });
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 4500);
}

/**
 * Global JWT-expiry handler.
 * Catches expired/invalid token errors anywhere in the app and bounces
 * the user to /signin instead of crashing the React tree.
 */
let bouncing = false;
export function handleAuthError(err) {
  if (!err) return false;
  const code = err.code || err.status;
  const msg = (err.message || "").toLowerCase();
  const expired =
    code === 401 ||
    code === "PGRST301" ||
    msg.includes("jwt expired") ||
    msg.includes("invalid jwt") ||
    msg.includes("invalid token");
  if (!expired || bouncing) return expired;
  bouncing = true;
  supabase.auth.signOut().finally(() => {
    showNativeError("Your session expired. Please sign in again.");
    const next = encodeURIComponent(
      window.location.pathname + window.location.search,
    );
    window.location.replace(`/signin?next=${next}`);
  });
  return true;
}

/* Catch background refresh failures */
supabase.auth.onAuthStateChange((event, session) => {
  if (event === "TOKEN_REFRESHED" && !session)
    handleAuthError({ message: "jwt expired" });
  if (
    event === "SIGNED_OUT" &&
    window.location.pathname.startsWith("/account")
  ) {
    window.location.replace("/signin");
  }
});

/* Catch unhandled promise rejections (most common JWT crash path) */
if (typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (e) => {
    handleAuthError(e?.reason);
  });
}
