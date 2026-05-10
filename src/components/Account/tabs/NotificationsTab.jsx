import { useState } from "react";
import { Bell, BellOff, Mail, Tag, Megaphone, ShieldAlert, CheckCircle2, RefreshCw, Smartphone } from "lucide-react";
import { useNotifications } from "../../../hooks/useNotifications";

export default function NotificationsTab() {
  const { permission, prefs, loading, requestPush, updatePref } = useNotifications();
  const [requesting, setRequesting] = useState(false);
  const [pushError, setPushError] = useState(null);

  const handleEnablePush = async () => {
    setRequesting(true);
    setPushError(null);
    const result = await requestPush();
    if (result?.error) setPushError(result.error);
    setRequesting(false);
  };

  if (loading) return (
    <div className="flex justify-center py-12">
      <RefreshCw size={22} className="text-faint animate-spin" />
    </div>
  );

  return (
    <div className="space-y-1 max-w-lg">

      {/* Push permission banner */}
      {permission === "granted" ? (
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 mb-4">
          <CheckCircle2 size={18} className="shrink-0" />
          <span className="text-sm font-semibold">Push notifications are enabled on this device</span>
        </div>
      ) : permission === "denied" ? (
        <div className="flex items-start gap-3 px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 mb-4">
          <ShieldAlert size={18} className="shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold">Notifications are blocked</p>
            <p className="text-red-500 dark:text-red-400 opacity-80 mt-0.5">
              To enable: go to your browser's <strong>Site Settings → Notifications</strong> and allow this site.
            </p>
          </div>
        </div>
      ) : (
        <div className="border border-app rounded-2xl bg-surface overflow-hidden mb-4">
          <div className="flex items-start gap-3 px-4 py-4">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0">
              <BellOff size={17} className="text-indigo-500 dark:text-indigo-400" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-main text-sm">Enable push notifications</p>
              <p className="text-xs text-muted mt-0.5">Get alerts for messages and deals even when the app is closed</p>
            </div>
          </div>

          {/* Mobile-friendly tip */}
          <div className="mx-4 mb-3 flex items-start gap-2 px-3 py-2.5 bg-amber-500/8 border border-amber-500/20 rounded-xl">
            <Smartphone size={13} className="text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
              On Android, close any floating chat bubbles or screen overlay apps before tapping Enable — Chrome blocks permission prompts when overlays are active.
            </p>
          </div>

          {pushError && (
            <p className="mx-4 mb-3 text-xs text-red-500 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
              {pushError.includes("overlay") || pushError.includes("bubble") || pushError.includes("permission")
                ? "Chrome blocked this — close any floating overlays from other apps, then try again."
                : pushError}
            </p>
          )}

          <div className="px-4 pb-4">
            <button
              onClick={handleEnablePush}
              disabled={requesting}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-black transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-md shadow-indigo-500/20"
            >
              {requesting
                ? <><RefreshCw size={15} className="animate-spin" /> Requesting…</>
                : <><Bell size={15} /> Enable Notifications</>}
            </button>
          </div>
        </div>
      )}

      {/* Push toggles */}
      <Section icon={Bell} title="Push Notifications" description="In-app alerts on this device">
        <Toggle
          icon={Tag}
          label="New listings"
          description="When relevant listings are posted in categories you browse"
          checked={prefs?.push_listings ?? true}
          disabled={permission !== "granted"}
          onChange={v => updatePref("push_listings", v)}
        />
        <Toggle
          icon={Megaphone}
          label="Messages"
          description="When someone sends you a message"
          checked={prefs?.push_messages ?? true}
          disabled={permission !== "granted"}
          onChange={v => updatePref("push_messages", v)}
        />
      </Section>

      <Divider />

      {/* Email toggles */}
      <Section icon={Mail} title="Email Notifications" description="Sent to your registered email address">
        <Toggle
          icon={Tag}
          label="Offers and deals"
          description="Platform-wide promotions and featured listings"
          checked={prefs?.email_offers ?? true}
          onChange={v => updatePref("email_offers", v)}
        />
        <Toggle
          icon={Megaphone}
          label="Marketing emails"
          description="Product updates, tips and newsletters"
          checked={prefs?.email_marketing ?? false}
          onChange={v => updatePref("email_marketing", v)}
        />
      </Section>
    </div>
  );
}

function Section({ icon: Icon, title, description, children }) {
  return (
    <div className="py-2">
      <div className="flex items-center gap-2.5 px-1 pb-3">
        <Icon size={15} className="text-indigo-500 dark:text-indigo-400 shrink-0" />
        <div>
          <p className="text-sm font-bold text-main">{title}</p>
          <p className="text-xs text-muted">{description}</p>
        </div>
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function Toggle({ icon: Icon, label, description, checked, onChange, disabled }) {
  return (
    <label className={`flex items-center gap-3 px-3 py-3.5 rounded-xl cursor-pointer transition-colors hover:bg-surface-2 ${disabled ? "opacity-40 pointer-events-none" : ""}`}>
      <Icon size={15} className="text-muted shrink-0" />
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-medium text-main">{label}</span>
        <span className="block text-xs text-muted mt-0.5">{description}</span>
      </span>
      <button
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={e => { e.preventDefault(); if (!disabled) onChange(!checked); }}
        className={`relative w-11 h-6 rounded-full shrink-0 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${checked ? "bg-indigo-600" : "bg-gray-200 dark:bg-slate-700"}`}
        aria-label={label}
      >
        <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${checked ? "translate-x-6" : "translate-x-1"}`} />
      </button>
    </label>
  );
}

function Divider() {
  return <div className="h-px bg-app my-2" />;
}
