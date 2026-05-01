import { createClient } from "@supabase/supabase-js";
import toast from "react-hot-toast";

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
    toast.error("Your session expired. Please sign in again.");
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
