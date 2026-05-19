// src/components/Account/tabs/NotificationsTab.jsx
//
// NO CHANGES NEEDED IN THIS FILE.
//
// The toggle persistence bug ("goes to OFF on page refresh") was entirely
// in useFCMToken.js — the token state wasn't being hydrated from Supabase
// on mount. That file has been fixed. This component is correct as-is.
//
// Left here as confirmation: this component is already wired up correctly.
// It calls useFCMToken(user?.id), and since useFCMToken now re-hydrates the
// token from Supabase/Firebase on mount, isEnabled will be true after a
// refresh as long as the user previously enabled notifications.

import { useAuth } from "../../../context/AuthContext";
import { useFCMToken } from "../../../hooks/useFCMToken";
import {
  Bell,
  BellOff,
  Loader2,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

export default function NotificationsTab() {
  const { user } = useAuth();
  const {
    isEnabled,
    permission,
    loading,
    error,
    requestPermission,
    revokeToken,
  } = useFCMToken(user?.id);

  const isDenied = permission === "denied";

  return (
    <div className="max-w-xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl font-black text-main tracking-tight">
          Notifications
        </h2>
        <p className="text-sm text-muted mt-1">
          Get notified when someone responds to your listings or there's
          activity in your account.
        </p>
      </div>

      {/* ── Push notifications card ─────────────────────────────────────── */}
      <div className="bg-surface border border-app rounded-2xl p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: isEnabled
                  ? "hsl(var(--success)/0.12)"
                  : "hsl(var(--surface-2))",
              }}
            >
              {isEnabled ? (
                <Bell size={18} style={{ color: "hsl(var(--success))" }} />
              ) : (
                <BellOff size={18} className="text-faint" />
              )}
            </div>
            <div>
              <p className="text-sm font-bold text-main">Push Notifications</p>
              <p className="text-xs text-muted mt-0.5">
                {isEnabled
                  ? "You'll receive notifications on this device."
                  : isDenied
                    ? "Notifications are blocked in your browser settings."
                    : "Enable to receive real-time alerts."}
              </p>
            </div>
          </div>

          {/* Toggle button */}
          {!isDenied && (
            <button
              onClick={isEnabled ? revokeToken : requestPermission}
              disabled={loading}
              className="shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: isEnabled
                  ? "hsl(var(--success))"
                  : "hsl(var(--border))",
              }}
              aria-label={
                isEnabled ? "Disable notifications" : "Enable notifications"
              }
              role="switch"
              aria-checked={isEnabled}
            >
              <span
                className="inline-block h-4 w-4 rounded-full bg-white shadow transition-transform"
                style={{
                  transform: isEnabled
                    ? "translateX(1.375rem)"
                    : "translateX(0.25rem)",
                }}
              />
            </button>
          )}
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-muted pt-1">
            <Loader2 size={13} className="animate-spin shrink-0" />
            {isEnabled ? "Disabling notifications…" : "Enabling notifications…"}
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div
            className="flex items-start gap-2 text-xs p-3 rounded-lg"
            style={{
              background: "hsl(var(--danger)/0.08)",
              color: "hsl(var(--danger))",
              border: "1px solid hsl(var(--danger)/0.2)",
            }}
          >
            <AlertTriangle size={13} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Success confirmation */}
        {isEnabled && !loading && !error && (
          <div
            className="flex items-center gap-2 text-xs p-3 rounded-lg"
            style={{
              background: "hsl(var(--success)/0.08)",
              color: "hsl(var(--success))",
              border: "1px solid hsl(var(--success)/0.2)",
            }}
          >
            <CheckCircle2 size={13} className="shrink-0" />
            Push notifications are active on this device.
          </div>
        )}

        {/* Blocked state instructions */}
        {isDenied && (
          <div
            className="flex items-start gap-2 text-xs p-3 rounded-lg"
            style={{
              background: "hsl(var(--warning)/0.08)",
              color: "hsl(var(--warning))",
              border: "1px solid hsl(var(--warning)/0.2)",
            }}
          >
            <AlertTriangle size={13} className="shrink-0 mt-0.5" />
            <span>
              Notifications are blocked. Click the lock icon in your browser
              address bar → Site settings → Notifications → Allow.
            </span>
          </div>
        )}
      </div>

      {/* ── Info note ─────────────────────────────────────────────────────── */}
      <p className="text-[11px] text-faint leading-relaxed">
        Notifications are sent securely via Firebase Cloud Messaging. Each
        device you enable is registered separately. You can disable
        notifications at any time from this page.
      </p>
    </div>
  );
}
