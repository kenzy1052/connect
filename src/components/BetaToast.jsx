// src/components/BetaToast.jsx
//
// TASK 5 — Beta Phase Feedback Toast
//
// Spec implemented:
//  ✅ Position: top-right corner, NOT a full-width banner
//  ✅ Triggers every time the app is opened (sessionStorage — survives in-app nav,
//     resets when the tab is closed / next real visit)
//  ✅ Animates in smoothly from the right edge (CSS translate + opacity)
//  ✅ Dismiss (X) button — removes toast, stores flag so it won't re-appear in session
//  ✅ Clicking the body (not X) navigates to /support — the WhatsApp feedback form
//  ✅ Fully responsive: 320px on mobile, fixed 360px on md+
//  ✅ Matches PWAInstallPrompt design language exactly:
//     - premium-card backdrop blur + gradient border
//     - gradient-brand top accent bar
//     - bg-brand-soft icon bubble
//     - text-brand / text-main / text-muted / text-faint palette
//     - No hardcoded colors; all CSS variables
//
// Usage — add ONE line to MainApp.jsx:
//   import BetaToast from "./components/BetaToast";
//   // inside JSX, after <PWAInstallPrompt />:
//   <BetaToast />

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Zap, ArrowRight } from "lucide-react";

// Dismiss persists for the current browser SESSION only.
// When the user closes the tab and reopens the app, it shows again.
const SESSION_KEY = "cc.beta_toast_dismissed";

export default function BetaToast() {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const dismissTimer = useRef(null);

  useEffect(() => {
    // Don't show if already dismissed this session
    if (sessionStorage.getItem(SESSION_KEY)) return;

    // Small entrance delay so it doesn't compete with page-load animations
    const showTimer = setTimeout(() => setVisible(true), 1200);
    return () => clearTimeout(showTimer);
  }, []);

  // Animate out, then unmount
  const dismiss = () => {
    setLeaving(true);
    sessionStorage.setItem(SESSION_KEY, "1");
    dismissTimer.current = setTimeout(() => setVisible(false), 420);
  };

  useEffect(() => () => clearTimeout(dismissTimer.current), []);

  const handleBodyClick = () => {
    dismiss();
    navigate("/support");
  };

  if (!visible) return null;

  return (
    /*
     * Fixed positioning: top-right corner.
     * z-index 8500 — below ConfirmModal (z-[9999]) and PWAInstallPrompt (z-[9000])
     * but above all regular page content.
     * On mobile: 16px from both right and top edges, max-width fills screen width.
     * On md+: fixed 360px wide.
     */
    <div
      role="dialog"
      aria-label="Beta phase feedback notice"
      aria-live="polite"
      className="fixed top-4 right-4 z-[8500] w-[calc(100vw-2rem)] sm:w-80 md:w-[360px]"
      style={{
        // Entrance: slide in from right + fade up
        // Exit:     slide out to right + fade out
        transform: leaving
          ? "translateX(calc(100% + 1.5rem))"
          : "translateX(0)",
        opacity: leaving ? 0 : 1,
        transition: leaving
          ? "transform 0.38s cubic-bezier(0.4, 0, 0.8, 0.2), opacity 0.32s ease"
          : "transform 0.44s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease",
        // Start off-screen right on mount so we can animate in
        animation: !leaving
          ? "cc-beta-slide-in 0.44s cubic-bezier(0.16, 1, 0.3, 1) both"
          : "none",
      }}
    >
      <style>{`
        @keyframes cc-beta-slide-in {
          from { transform: translateX(calc(100% + 1.5rem)); opacity: 0; }
          to   { transform: translateX(0);                   opacity: 1; }
        }
      `}</style>

      {/*
       * Card shell — identical pattern to PWAInstallPrompt:
       *   premium-card = backdrop-blur + gradient surface + border + shadow-soft
       */}
      <div
        className="rounded-2xl border overflow-hidden shadow-2xl"
        style={{
          background:
            "linear-gradient(145deg, hsl(var(--surface)/0.96), hsl(var(--surface-2)/0.88))",
          borderColor: "hsl(var(--primary)/0.28)",
          boxShadow:
            "0 20px 60px hsl(0 0% 0% / 0.28), 0 0 0 1px hsl(var(--primary)/0.12)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        }}
      >
        {/* Top accent gradient bar — matches PWAInstallPrompt */}
        <div className="h-[3px] w-full gradient-brand" aria-hidden="true" />

        {/*
         * Clickable body area (navigates to /support).
         * The X dismiss button lives inside but stops propagation.
         */}
        <div
          role="button"
          tabIndex={0}
          onClick={handleBodyClick}
          onKeyDown={(e) => e.key === "Enter" && handleBodyClick()}
          className="p-4 pr-10 cursor-pointer select-none group"
          aria-label="Open feedback form"
        >
          {/* Header row: icon + badge */}
          <div className="flex items-center gap-2.5 mb-2.5">
            {/* Zap icon in brand-soft bubble */}
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
              style={{
                background: "hsl(var(--primary)/0.14)",
                border: "1px solid hsl(var(--primary)/0.2)",
              }}
            >
              <Zap
                size={16}
                className="text-brand"
                fill="hsl(var(--primary))"
              />
            </div>

            <div className="min-w-0">
              {/* Beta badge pill */}
              <span
                className="inline-block text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full mb-0.5"
                style={{
                  background: "hsl(var(--primary)/0.12)",
                  color: "hsl(var(--primary))",
                  border: "1px solid hsl(var(--primary)/0.2)",
                }}
              >
                Beta Phase
              </span>
              <p className="text-sm font-black text-main leading-tight">
                CampusConnect is in Beta
              </p>
            </div>
          </div>

          {/* Body text */}
          <p className="text-[12.5px] text-muted leading-relaxed mb-3">
            We&apos;re still building! If you spot a bug or have a suggestion,
            we&apos;d love to hear from you.
          </p>

          {/* CTA link row */}
          <div
            className="flex items-center gap-1.5 text-[12px] font-bold text-brand
              group-hover:gap-2.5 transition-all duration-200"
          >
            <span>Send feedback</span>
            <ArrowRight
              size={13}
              className="transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </div>
        </div>

        {/* ── Dismiss (X) button ── */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            dismiss();
          }}
          aria-label="Dismiss beta notice"
          className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center
            text-faint hover:text-main hover:bg-surface-2 transition-colors"
          style={{ position: "absolute" }}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
