// src/components/Account/tabs/NotificationsTab.jsx
import { useContext } from "react";
import {
  Bell,
  BellOff,
  Mail,
  Tag,
  Megaphone,
  ShieldAlert,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { useNotifications } from "../../../hooks/useNotifications";

export default function NotificationsTab() {
  const { permission, prefs, loading, requestPush, updatePref } =
    useNotifications();

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}>
        <RefreshCw size={22} style={{ animation: "spin 1s linear infinite", opacity: 0.5 }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="notifications-tab">
      {/* ── Push Permission Banner ── */}
      <PushBanner permission={permission} onRequest={requestPush} />

      {/* ── Push Toggles ── */}
      <Section
        icon={<Bell size={16} />}
        title="Push Notifications"
        description="In-browser alerts when you're on CampusConnect"
      >
        <Toggle
          icon={<Tag size={15} />}
          label="New listings"
          description="When relevant listings are posted"
          checked={prefs?.push_listings ?? true}
          disabled={permission !== "granted"}
          onChange={(v) => updatePref("push_listings", v)}
        />
      </Section>

      <Divider />

      {/* ── Email Toggles ── */}
      <Section
        icon={<Mail size={16} />}
        title="Email Notifications"
        description="Sent to your registered email address"
      >
        <Toggle
          icon={<Tag size={15} />}
          label="Offers & deals"
          description="Platform-wide promotions and featured listings"
          checked={prefs?.email_offers ?? true}
          onChange={(v) => updatePref("email_offers", v)}
        />
        <Toggle
          icon={<Megaphone size={15} />}
          label="Marketing emails"
          description="Product updates, tips and newsletters"
          checked={prefs?.email_marketing ?? false}
          onChange={(v) => updatePref("email_marketing", v)}
        />
      </Section>

      <style>{STYLES}</style>
    </div>
  );
}

function PushBanner({ permission, onRequest }) {
  if (permission === "granted") {
    return (
      <div className="push-banner push-banner--granted">
        <CheckCircle2 size={17} />
        <span>Push notifications are enabled</span>
      </div>
    );
  }
  if (permission === "denied") {
    return (
      <div className="push-banner push-banner--denied">
        <ShieldAlert size={17} />
        <span>
          Notifications are blocked in your browser settings. Enable them in{" "}
          <strong>Site Settings → Notifications</strong> to use push alerts.
        </span>
      </div>
    );
  }
  return (
    <div className="push-banner push-banner--default">
      <div className="push-banner__left">
        <BellOff size={17} />
        <div>
          <p className="push-banner__title">Enable push notifications</p>
          <p className="push-banner__sub">Get alerts without being on the app</p>
        </div>
      </div>
      <button className="push-banner__btn" onClick={onRequest}>Enable</button>
    </div>
  );
}

function Section({ icon, title, description, children }) {
  return (
    <div className="notif-section">
      <div className="notif-section__header">
        <span className="notif-section__icon">{icon}</span>
        <div>
          <p className="notif-section__title">{title}</p>
          <p className="notif-section__desc">{description}</p>
        </div>
      </div>
      <div className="notif-section__rows">{children}</div>
    </div>
  );
}

function Toggle({ icon, label, description, checked, onChange, disabled }) {
  return (
    <label className={`notif-toggle${disabled ? " notif-toggle--disabled" : ""}`}>
      <span className="notif-toggle__icon">{icon}</span>
      <span className="notif-toggle__text">
        <span className="notif-toggle__label">{label}</span>
        <span className="notif-toggle__desc">{description}</span>
      </span>
      <button
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`notif-switch${checked ? " notif-switch--on" : ""}`}
        aria-label={label}
      >
        <span className="notif-switch__thumb" />
      </button>
    </label>
  );
}

function Divider() {
  return <div className="notif-divider" />;
}

// NOTE: All hardcoded blue (#6366f1) replaced with hsl(var(--primary))
// so the tab adapts to any selected theme automatically.
const STYLES = `
  .notifications-tab {
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-width: 520px;
  }

  /* ── Push banner ── */
  .push-banner {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 13px 16px;
    border-radius: 12px;
    font-size: 13.5px;
    font-weight: 500;
    margin-bottom: 8px;
    border: 1px solid transparent;
  }
  .push-banner--granted {
    background: color-mix(in srgb, var(--color-success, #4ade80) 12%, transparent);
    color: var(--color-success, #4ade80);
    border-color: color-mix(in srgb, var(--color-success, #4ade80) 30%, transparent);
  }
  .push-banner--denied {
    background: color-mix(in srgb, var(--color-error, #f87171) 10%, transparent);
    color: var(--color-text-secondary, rgba(255,255,255,0.7));
    border-color: color-mix(in srgb, var(--color-error, #f87171) 25%, transparent);
    line-height: 1.5;
  }
  .push-banner--denied strong { color: var(--color-text, #fff); }
  .push-banner--default {
    background: var(--color-surface-raised, rgba(255,255,255,0.06));
    border-color: var(--color-border, rgba(255,255,255,0.1));
    color: var(--color-text, #fff);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .push-banner__left {
    display: flex;
    align-items: center;
    gap: 10px;
    color: var(--color-text-secondary, rgba(255,255,255,0.6));
  }
  .push-banner__title { margin: 0; font-size: 13.5px; font-weight: 600; color: var(--color-text, #fff); }
  .push-banner__sub { margin: 2px 0 0; font-size: 12px; color: var(--color-text-secondary, rgba(255,255,255,0.5)); }
  .push-banner__btn {
    padding: 7px 18px;
    border-radius: 8px;
    border: none;
    background: hsl(var(--primary));
    color: hsl(var(--primary-fg, 0 0% 100%));
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: filter 0.15s, transform 0.1s;
    flex-shrink: 0;
  }
  .push-banner__btn:hover { filter: brightness(1.1); transform: translateY(-1px); }
  .push-banner__btn:active { transform: translateY(0); }

  /* ── Section ── */
  .notif-section { padding: 8px 0; }
  .notif-section__header { display: flex; align-items: flex-start; gap: 10px; padding: 4px 2px 12px; }
  .notif-section__icon {
    color: hsl(var(--primary));
    margin-top: 2px;
    flex-shrink: 0;
  }
  .notif-section__title { margin: 0; font-size: 14px; font-weight: 700; color: var(--color-text, #fff); }
  .notif-section__desc { margin: 2px 0 0; font-size: 12px; color: var(--color-text-secondary, rgba(255,255,255,0.5)); }
  .notif-section__rows { display: flex; flex-direction: column; gap: 2px; }

  /* ── Toggle row ── */
  .notif-toggle {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    border-radius: 10px;
    cursor: pointer;
    transition: background 0.15s;
  }
  .notif-toggle:hover { background: var(--color-surface-hover, rgba(255,255,255,0.04)); }
  .notif-toggle--disabled { opacity: 0.4; cursor: not-allowed; pointer-events: none; }
  .notif-toggle__icon { color: var(--color-text-secondary, rgba(255,255,255,0.45)); flex-shrink: 0; }
  .notif-toggle__text { flex: 1; display: flex; flex-direction: column; gap: 2px; }
  .notif-toggle__label { font-size: 13.5px; font-weight: 500; color: var(--color-text, #fff); }
  .notif-toggle__desc { font-size: 12px; color: var(--color-text-secondary, rgba(255,255,255,0.45)); }

  /* ── Switch ── */
  .notif-switch {
    position: relative;
    width: 42px;
    height: 24px;
    border-radius: 100px;
    border: none;
    background: var(--color-surface-muted, rgba(255,255,255,0.15));
    cursor: pointer;
    transition: background 0.2s;
    flex-shrink: 0;
    padding: 0;
  }
  .notif-switch--on { background: hsl(var(--primary)); }
  .notif-switch:disabled { cursor: not-allowed; }
  .notif-switch__thumb {
    position: absolute;
    top: 3px;
    left: 3px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #fff;
    transition: transform 0.2s cubic-bezier(0.34,1.4,0.64,1);
    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
  }
  .notif-switch--on .notif-switch__thumb { transform: translateX(18px); }

  /* ── Divider ── */
  .notif-divider {
    height: 1px;
    background: var(--color-border, rgba(255,255,255,0.08));
    margin: 8px 0;
  }
`;
