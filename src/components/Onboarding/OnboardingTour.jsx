// src/components/Onboarding/OnboardingTour.jsx
//
// First-visit guided tour. Spotlights one nav element at a time (via
// data-tour="..." attributes placed on the relevant buttons/links) with a
// small tooltip card explaining what it does. Auto-runs once per browser
// (see useOnboardingTour) and can be replayed from Settings → Personalizatio.

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { X, ArrowRight, ArrowLeft } from "lucide-react";
import { useOnboardingTour } from "../../context/OnboardingContext";

const SPOTLIGHT_PADDING = 8;
const MARGIN = 14;

// Some steps target an element that exists twice in the DOM (once for the
// desktop header, once for the mobile header/bottom nav) with CSS deciding
// which is actually visible at the current viewport. Pick whichever one is
// currently rendered with real size.
function getVisibleTarget(id) {
  if (!id) return null;
  const els = document.querySelectorAll(`[data-tour="${id}"]`);
  for (const el of els) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

export default function OnboardingTour() {
  const { active, step, stepIndex, steps, isFirst, isLast, next, back, skip } =
    useOnboardingTour();

  const [rect, setRect] = useState(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const cardRef = useRef(null);

  // Track the current target's position, following it through scroll/resize
  // and the brief settle window after we auto-scroll it into view.
  useEffect(() => {
    if (!active) return;
    if (!step?.target) {
      setRect(null);
      return;
    }

    let cancelled = false;
    const measure = () => {
      if (cancelled) return;
      const el = getVisibleTarget(step.target);
      setRect(el ? el.getBoundingClientRect() : null);
    };

    const el = getVisibleTarget(step.target);
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
    measure();

    const onScroll = () => measure();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);

    let ticks = 0;
    const interval = setInterval(() => {
      measure();
      ticks += 1;
      if (ticks > 16) clearInterval(interval);
    }, 60);

    return () => {
      cancelled = true;
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
      clearInterval(interval);
    };
  }, [active, step]);

  // Position the tooltip card next to the target (or centered if this step
  // has none, e.g. the welcome/done slides).
  useLayoutEffect(() => {
    if (!active) return;
    const cardEl = cardRef.current;
    if (!cardEl) return;

    const cw = cardEl.offsetWidth;
    const ch = cardEl.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    if (!rect) {
      setPos({
        top: Math.round((vh - ch) / 2),
        left: Math.round((vw - cw) / 2),
      });
      return;
    }

    const spaceBelow = vh - rect.bottom;
    const spaceAbove = rect.top;
    let top =
      spaceBelow >= ch + MARGIN * 2 || spaceBelow >= spaceAbove
        ? rect.bottom + MARGIN
        : rect.top - ch - MARGIN;
    top = Math.min(Math.max(top, MARGIN), Math.max(MARGIN, vh - ch - MARGIN));

    let left = rect.left + rect.width / 2 - cw / 2;
    left = Math.min(Math.max(left, MARGIN), Math.max(MARGIN, vw - cw - MARGIN));

    setPos({ top, left });
  }, [active, rect, step]);

  if (!active || !step) return null;

  return (
    <div className="fixed inset-0 z-[500]" role="dialog" aria-modal="true">
      {/* Dimmed backdrop, with a spotlight cutout around the current target */}
      {rect ? (
        <div
          className="fixed pointer-events-none rounded-xl transition-[top,left,width,height] duration-200 ease-out"
          style={{
            top: rect.top - SPOTLIGHT_PADDING,
            left: rect.left - SPOTLIGHT_PADDING,
            width: rect.width + SPOTLIGHT_PADDING * 2,
            height: rect.height + SPOTLIGHT_PADDING * 2,
            boxShadow: "0 0 0 9999px rgba(3, 6, 15, 0.72)",
            border: "2px solid hsl(var(--primary))",
          }}
        />
      ) : (
        <div className="fixed inset-0 bg-[rgba(3,6,15,0.72)]" />
      )}

      {/* Clicking the dimmed area skips the tour */}
      <div className="fixed inset-0" onClick={skip} />

      {/* Tooltip card */}
      <div
        ref={cardRef}
        onClick={(e) => e.stopPropagation()}
        className="fixed w-[calc(100vw-28px)] max-w-[340px] premium-card p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        style={{ top: pos.top, left: pos.left }}
      >
        <button
          onClick={skip}
          aria-label="Skip tour"
          className="absolute top-3 right-3 p-1 rounded-md text-faint hover:text-main transition-colors"
        >
          <X size={16} />
        </button>

        <p className="text-[11px] font-bold uppercase tracking-wider text-brand mb-2">
          Step {stepIndex + 1} of {steps.length}
        </p>
        <h3 className="text-base font-bold text-main mb-1.5 pr-6">
          {step.title}
        </h3>
        <p className="text-sm text-muted leading-relaxed mb-5">{step.body}</p>

        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-1.5">
            {steps.map((s, i) => (
              <span
                key={s.id}
                className="h-1.5 rounded-full transition-all"
                style={{
                  width: i === stepIndex ? 16 : 6,
                  background:
                    i === stepIndex
                      ? "hsl(var(--primary))"
                      : "hsl(var(--border))",
                }}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                onClick={back}
                aria-label="Back"
                className="h-9 w-9 grid place-items-center rounded-md bg-surface-2 hover:bg-surface-hover text-main transition-colors"
              >
                <ArrowLeft size={15} />
              </button>
            )}
            <button
              onClick={next}
              className="h-9 px-4 inline-flex items-center gap-1.5 rounded-md gradient-brand text-[hsl(var(--primary-fg))] text-sm font-semibold"
            >
              {isLast ? "Done" : "Next"}
              {!isLast && <ArrowRight size={15} />}
            </button>
          </div>
        </div>

        {!isLast && (
          <button
            onClick={skip}
            className="mt-3 text-xs text-faint hover:text-muted transition-colors w-full text-center"
          >
            Skip tour
          </button>
        )}
      </div>
    </div>
  );
}
