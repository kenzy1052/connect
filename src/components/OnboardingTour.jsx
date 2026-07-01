// src/components/OnboardingTour.jsx
//
// Lightweight in-app product tour for first-time visitors.
// No new dependencies — uses framer-motion (already installed).
//
// USAGE:
//   1. Drop <OnboardingTour /> anywhere in your app tree that is rendered
//      on EVERY page (e.g. inside App.jsx right below <AppRouter />, or
//      inside MainApp.jsx just before </>).
//   2. Add `data-tour="stepId"` attributes to the elements you want to
//      highlight (see STEPS below).
//   3. It auto-starts on the first visit (localStorage flag "cc.tour.v1").
//      Users can Skip, Next through, or Finish. It never runs again unless
//      you call window.__ccStartTour() from the console / a menu item.

import { useEffect, useLayoutEffect, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";

// ── Define your steps here ─────────────────────────────────────────────
// `target`  → CSS selector for the element to highlight
//              (use data-tour="xxx" attributes for stability)
// `route`   → optional: navigate here before showing the step
// `title`   → short heading
// `body`    → 1–2 sentence description
// `placement` → "top" | "bottom" | "left" | "right" | "center"
const STEPS = [
  {
    target: null,
    placement: "center",
    title: "Welcome to CampusConnect 👋",
    body: "A quick 60-second tour so you know where everything lives. You can skip anytime.",
  },
  {
    target: '[data-tour="sign-in"]',
    placement: "bottom",
    title: "Sign in first",
    body: "Tap here to sign in or create an account. You need an account to post, save or message.",
  },
  {
    target: '[data-tour="browse"]',
    placement: "bottom",
    title: "Browse listings",
    body: "See everything that's for sale on campus. Use filters to narrow by category or price.",
  },
  {
    target: '[data-tour="create"]',
    placement: "bottom",
    title: "Post something",
    body: "Selling a book, a phone, or offering a service? Tap here to create a listing in under a minute.",
  },
  {
    target: '[data-tour="account"]',
    placement: "bottom",
    title: "Your account",
    body: "Your dashboard, saved items, messages and listings all live here.",
  },
  {
    target: '[data-tour="settings"]',
    placement: "left",
    route: "/account/Personalization",
    title: "Personalize the app",
    body: "Change the color theme, font, text size and light/dark mode from Personalizatio.",
  },
  {
    target: '[data-tour="profile"]',
    placement: "left",
    route: "/account/profile",
    title: "Complete your profile",
    body: "Add a photo and your details — sellers with complete profiles get more replies.",
  },
  {
    target: null,
    placement: "center",
    title: "You're all set 🎉",
    body: "You can restart this tour any time from Account → Need Help.",
  },
];

const STORAGE_KEY = "cc.tour.v1";
const PAD = 8; // px of breathing room around the highlighted element

export default function OnboardingTour() {
  const [active, setActive] = useState(false);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Expose a global restart hook for menus / support pages
  useEffect(() => {
    window.__ccStartTour = () => {
      setIndex(0);
      setActive(true);
    };
  }, []);

  // Auto-start on first visit
  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        // Small delay so the UI has mounted
        const t = setTimeout(() => setActive(true), 800);
        return () => clearTimeout(t);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const finish = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setActive(false);
    setIndex(0);
  }, []);

  const step = STEPS[index];

  // Navigate to the step's route BEFORE trying to measure the target
  useEffect(() => {
    if (!active || !step) return;
    if (step.route && location.pathname !== step.route) {
      navigate(step.route);
    }
  }, [active, step, location.pathname, navigate]);

  // Measure the target element (and re-measure on scroll / resize)
  useLayoutEffect(() => {
    if (!active || !step) {
      setRect(null);
      return;
    }
    if (!step.target) {
      setRect(null);
      return;
    }

    let raf = 0;
    const measure = () => {
      const el = document.querySelector(step.target);
      if (!el) {
        setRect(null);
        return;
      }
      el.scrollIntoView({ block: "center", behavior: "smooth" });
      // Wait one frame so scroll lands before we measure
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        setRect({
          top: r.top - PAD,
          left: r.left - PAD,
          width: r.width + PAD * 2,
          height: r.height + PAD * 2,
        });
      });
    };

    // Give the router a beat to render before measuring
    const t = setTimeout(measure, step.route ? 400 : 50);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, { passive: true });
    return () => {
      clearTimeout(t);
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure);
    };
  }, [active, step, location.pathname]);

  if (!active || !step) return null;

  const isLast = index === STEPS.length - 1;
  const next = () => (isLast ? finish() : setIndex((i) => i + 1));
  const back = () => setIndex((i) => Math.max(0, i - 1));

  // Popover positioning
  const popover = getPopoverPosition(rect, step.placement);

  return (
    <AnimatePresence>
      <motion.div
        key="cc-tour"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          pointerEvents: "auto",
        }}
      >
        {/* Dim overlay with a cut-out for the target */}
        <svg
          width="100%"
          height="100%"
          style={{ position: "absolute", inset: 0, pointerEvents: "auto" }}
          onClick={next}
        >
          <defs>
            <mask id="cc-tour-mask">
              <rect width="100%" height="100%" fill="white" />
              {rect && (
                <rect
                  x={rect.left}
                  y={rect.top}
                  width={rect.width}
                  height={rect.height}
                  rx="10"
                  ry="10"
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgba(0,0,0,0.65)"
            mask="url(#cc-tour-mask)"
          />
          {rect && (
            <rect
              x={rect.left}
              y={rect.top}
              width={rect.width}
              height={rect.height}
              rx="10"
              ry="10"
              fill="none"
              stroke="rgba(96, 165, 250, 0.9)"
              strokeWidth="2"
            />
          )}
        </svg>

        {/* Popover card */}
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "fixed",
            ...popover,
            maxWidth: 340,
            width: "calc(100vw - 32px)",
            background: "hsl(var(--card, 0 0% 100%))",
            color: "hsl(var(--foreground, 220 20% 12%))",
            borderRadius: 14,
            boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
            padding: 18,
            border: "1px solid hsl(var(--border, 220 15% 88%))",
          }}
        >
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>
            Step {index + 1} of {STEPS.length}
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>
            {step.title}
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.45, opacity: 0.9 }}>
            {step.body}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 14,
              gap: 8,
            }}
          >
            <button
              onClick={finish}
              style={{
                background: "transparent",
                border: "none",
                color: "inherit",
                opacity: 0.7,
                fontSize: 13,
                cursor: "pointer",
                padding: "6px 8px",
              }}
            >
              Skip tour
            </button>

            <div style={{ display: "flex", gap: 8 }}>
              {index > 0 && (
                <button
                  onClick={back}
                  style={{
                    background: "transparent",
                    border: "1px solid hsl(var(--border, 220 15% 88%))",
                    color: "inherit",
                    borderRadius: 8,
                    padding: "8px 12px",
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Back
                </button>
              )}
              <button
                onClick={next}
                style={{
                  background: "hsl(var(--primary, 217 91% 60%))",
                  color: "hsl(var(--primary-foreground, 0 0% 100%))",
                  border: "none",
                  borderRadius: 8,
                  padding: "8px 14px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {isLast ? "Finish" : "Next →"}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function getPopoverPosition(rect, placement) {
  const vw = typeof window !== "undefined" ? window.innerWidth : 360;
  const vh = typeof window !== "undefined" ? window.innerHeight : 640;

  if (!rect || placement === "center") {
    return { left: "50%", top: "50%", transform: "translate(-50%, -50%)" };
  }

  const gap = 12;
  switch (placement) {
    case "top":
      return {
        left: Math.max(16, Math.min(vw - 356, rect.left)),
        top: Math.max(16, rect.top - 200 - gap),
      };
    case "left":
      return {
        left: Math.max(16, rect.left - 356),
        top: Math.max(16, Math.min(vh - 200, rect.top)),
      };
    case "right":
      return {
        left: Math.min(vw - 356, rect.left + rect.width + gap),
        top: Math.max(16, Math.min(vh - 200, rect.top)),
      };
    case "bottom":
    default:
      return {
        left: Math.max(16, Math.min(vw - 356, rect.left)),
        top: Math.min(vh - 220, rect.top + rect.height + gap),
      };
  }
}
