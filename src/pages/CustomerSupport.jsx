import { useState } from "react";
import { MessageCircle, Send, Phone, Mail, Loader2 } from "lucide-react";
import { useToast } from "../context/ToastContext";
const SUPPORT_PHONE = "0546 945 944";
const SUPPORT_PHONE_INTL = "233546945944"; // E.164 without "+"
const BUSINESS_EMAIL = "hello@campusconnect.com";

export default function CustomerSupport() {
  const toast = useToast();
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    const n = name.trim();
    const s = subject.trim();
    const m = message.trim();
    if (!n || !s || !m) {
      toast.error("Please fill in all fields.");
      return;
    }

    setBusy(true);
    const text =
      `*New CampusConnect support request*\n\n` +
      `*Name:* ${n}\n` +
      `*Subject:* ${s}\n\n` +
      `${m}`;

    const url = `https://wa.me/${SUPPORT_PHONE_INTL}?text=${encodeURIComponent(text)}`;
    // open in a new tab — WhatsApp app or web
    window.open(url, "_blank", "noopener,noreferrer");
    toast.success("Opening WhatsApp…");
    setBusy(false);
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      <header className="mb-8">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-faint">
          Support
        </p>
        <h1 className="mt-1 text-2xl md:text-3xl font-bold text-main tracking-tight">
          We're here to help
        </h1>
        <p className="mt-2 text-sm text-muted max-w-xl">
          Send us a message and we'll continue the conversation on WhatsApp.
          Most messages are answered within a few hours.
        </p>
      </header>

      <div className="grid md:grid-cols-[1fr_320px] gap-6">
        {/* Form */}
        <form
          onSubmit={submit}
          className="bg-surface border border-app rounded-md p-6 md:p-8 space-y-5"
        >
          <Field label="Your name" htmlFor="cs-name">
            <input
              id="cs-name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ama Mensah"
              className="w-full bg-surface-2 border border-app rounded-md px-3.5 h-11 text-sm text-main placeholder:text-faint focus:outline-none focus:border-[hsl(var(--primary))]"
              required
            />
          </Field>

          <Field label="Subject" htmlFor="cs-subject">
            <input
              id="cs-subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Payment issue, Listing report, Question"
              className="w-full bg-surface-2 border border-app rounded-md px-3.5 h-11 text-sm text-main placeholder:text-faint focus:outline-none focus:border-[hsl(var(--primary))]"
              required
            />
          </Field>

          <Field label="Message" htmlFor="cs-message">
            <textarea
              id="cs-message"
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us what's going on…"
              className="w-full bg-surface-2 border border-app rounded-md px-3.5 py-3 text-sm text-main placeholder:text-faint focus:outline-none focus:border-[hsl(var(--primary))] resize-y"
              required
            />
          </Field>

          <p className="text-[11px] text-faint">
            By submitting, you'll be redirected to WhatsApp with your message
            ready to send.
          </p>

          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 gradient-brand text-[hsl(var(--primary-fg))] h-11 px-5 rounded-md font-semibold text-sm shadow-[0_4px_18px_hsl(var(--primary)/0.35)] disabled:opacity-60"
          >
            {busy ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
            Send via WhatsApp
          </button>
        </form>

        {/* Side: contact channels */}
        <aside className="space-y-3">
          <ContactCard
            href={`https://wa.me/${SUPPORT_PHONE_INTL}`}
            icon={<MessageCircle size={18} />}
            title="WhatsApp"
            value="Chat with our team"
            accent
          />
          <ContactCard
            href={`tel:+${SUPPORT_PHONE_INTL}`}
            icon={<Phone size={18} />}
            title="Call us"
            value={SUPPORT_PHONE}
          />
          <ContactCard
            href={`mailto:${BUSINESS_EMAIL}`}
            icon={<Mail size={18} />}
            title="Email"
            value={BUSINESS_EMAIL}
          />

          <div className="bg-surface border border-app rounded-md p-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-faint mb-2">
              Hours
            </p>
            <p className="text-sm text-main font-medium">Mon – Sat</p>
            <p className="text-xs text-muted">8:00 — 20:00 GMT</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Field({ label, htmlFor, children }) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="block text-[11px] font-semibold uppercase tracking-widest text-faint mb-2"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function ContactCard({ href, icon, title, value, accent }) {
  return (
    <a
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel={href.startsWith("http") ? "noreferrer" : undefined}
      className={`block bg-surface border border-app rounded-md p-4 transition-colors hover:border-[hsl(var(--primary))] ${accent ? "ring-1 ring-[hsl(var(--primary)/0.2)]" : ""}`}
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 grid place-items-center rounded-md bg-brand-soft text-brand">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-widest text-faint">
            {title}
          </p>
          <p className="text-sm font-medium text-main truncate">{value}</p>
        </div>
      </div>
    </a>
  );
}
