import { useEffect, useRef, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Search, ShieldCheck, Sparkles } from "lucide-react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  AnimatePresence,
} from "framer-motion";

/* ─────────────────────────────────────────────────────────────────────────────
 * SLIDES CONFIG
 * First slide → main display. Remaining slides → thumbnail squares.
 * Keep exactly 5 entries so there are always 4 thumbnails showing.
 * ───────────────────────────────────────────────────────────────────────────── */
const INITIAL_SLIDES = [
  { src: "/1.jpg", label: "Electronics" },
  { src: "/2.jpg", label: "Textbooks" },
  { src: "/3.jpg", label: "Hostels" },
  { src: "/4.jpg", label: "Fashion" },
  { src: "/5.jpg", label: "Services" },
];

const AUTO_INTERVAL = 3000;

const itemVariant = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.52, ease: [0.22, 1, 0.36, 1] },
  },
};

/* ═════════════════════════════════════════════════════════════════════════════
 * HeroSection
 * ═════════════════════════════════════════════════════════════════════════════ */
export default function HeroSection() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const visualX = useSpring(useTransform(pointerX, [-0.5, 0.5], [-8, 8]), {
    stiffness: 60,
    damping: 22,
  });
  const visualY = useSpring(useTransform(pointerY, [-0.5, 0.5], [-5, 5]), {
    stiffness: 60,
    damping: 22,
  });

  const handleMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    pointerX.set((e.clientX - rect.left) / rect.width - 0.5);
    pointerY.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const submit = (e) => {
    e.preventDefault();
    const term = q.trim();
    if (term) navigate(`/search?q=${encodeURIComponent(term)}`);
  };

  return (
    <section
      onMouseMove={handleMove}
      onMouseLeave={() => {
        pointerX.set(0);
        pointerY.set(0);
      }}
      className="relative isolate w-full overflow-hidden bg-app"
    >
      {/* Ambient glows */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-app" />
        <div
          className="absolute -top-24 right-0 h-[520px] w-[520px] rounded-full opacity-40"
          style={{
            background:
              "radial-gradient(circle, hsl(var(--primary) / 0.14), transparent 70%)",
            filter: "blur(56px)",
          }}
        />
        <div
          className="absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full opacity-30"
          style={{
            background:
              "radial-gradient(circle, hsl(var(--primary-2) / 0.12), transparent 70%)",
            filter: "blur(64px)",
          }}
        />
      </div>

      <div
        className="mx-auto grid h-full max-w-7xl items-start lg:items-center gap-8 px-4 sm:px-6 lg:grid-cols-[1fr_1fr] lg:gap-12 lg:min-h-[calc(100svh-64px)]"
        style={{
          paddingTop: "clamp(1.75rem, 5svh, 3rem)",
          paddingBottom: "clamp(1.75rem, 4svh, 2.5rem)",
        }}
      >
        {/* ── LEFT — text & search ── */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: {
              transition: { staggerChildren: 0.09, delayChildren: 0.04 },
            },
          }}
          className="flex flex-col justify-center max-w-lg mx-auto lg:mx-0 items-center text-center lg:items-start lg:text-left"
        >
          <motion.span
            variants={itemVariant}
            className="inline-flex w-fit items-center gap-2 rounded-full border border-app bg-brand-soft px-3 py-1.5 text-[11px] font-semibold text-brand"
          >
            <Sparkles size={12} />
            Premium campus marketplace
          </motion.span>

          <motion.h1
            variants={itemVariant}
            className="mt-4 text-[2.1rem] font-bold leading-[1.18] tracking-tight text-main sm:text-[2.5rem] md:text-[2.75rem]"
          >
            Trade smarter,{" "}
            <span className="text-brand" style={{ WebkitTextStroke: "0px" }}>
              right on campus.
            </span>
          </motion.h1>

          <motion.p
            variants={itemVariant}
            className="mt-3 text-sm leading-relaxed text-muted sm:text-[0.95rem] max-w-md"
          >
            CampusConnect is the marketplace built for UCC students — buy, sell
            and discover phones, textbooks, hostels, services, and more from
            people you actually know.
          </motion.p>

          {/* Search */}
          <motion.form
            variants={itemVariant}
            onSubmit={submit}
            className="mt-6 w-full max-w-md"
          >
            <div className="flex items-center gap-2 rounded-lg border border-app bg-surface p-1.5 shadow-sm">
              <Search size={16} className="ml-2.5 shrink-0 text-faint" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Phones, books, hostels, services…"
                className="min-w-0 flex-1 bg-transparent py-2 text-sm text-main outline-none placeholder:text-faint"
              />
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                type="submit"
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-brand px-4 text-[13px] font-semibold text-[hsl(var(--primary-fg))] transition-opacity hover:opacity-90"
              >
                Search
                <ArrowRight size={13} />
              </motion.button>
            </div>
          </motion.form>

          {/* CTAs */}
          <motion.div
            variants={itemVariant}
            className="mt-4 flex flex-wrap items-center justify-center lg:justify-start gap-2.5"
          >
            <Link
              to="/browse"
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-app bg-surface px-4 text-sm font-semibold text-main transition-colors hover:border-[hsl(var(--primary)/0.5)] hover:bg-surface-2"
            >
              Browse marketplace
              <ArrowRight size={14} />
            </Link>
            <Link
              to="/create"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-[hsl(var(--primary-fg))] transition-opacity hover:opacity-85"
            >
              Post a listing
            </Link>
          </motion.div>

          <motion.p
            variants={itemVariant}
            className="mt-4 inline-flex items-center gap-1.5 text-[11.5px] text-faint"
          >
            <ShieldCheck size={13} className="text-brand" />
            Safer student-to-student exchange at UCC.
          </motion.p>
        </motion.div>

        {/* ── RIGHT — gallery, desktop only ── */}
        <motion.div
          style={{ x: visualX, y: visualY }}
          className="hidden lg:flex items-center justify-center w-full"
        >
          <HeroGallery slides={INITIAL_SLIDES} interval={AUTO_INTERVAL} />
        </motion.div>
      </div>
    </section>
  );
}

/* ═════════════════════════════════════════════════════════════════════════════
 * HeroGallery
 *
 * Layout:
 *   ┌─────────────────────────────────────┐
 *   │           MAIN DISPLAY (16:9)       │  ← auto-swipes, no click
 *   └─────────────────────────────────────┘
 *   ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
 *   │   □    │ │   □    │ │   □    │ │   □    │  ← 4 equal squares, clickable
 *   └────────┘ └────────┘ └────────┘ └────────┘
 *
 * • 4 thumbnails always visible (slides[1–4]).
 * • Each thumbnail is a perfect square (aspect-ratio 1/1).
 * • Row spans full width of main display.
 * • Click swaps that thumb's image into the main display.
 * ═════════════════════════════════════════════════════════════════════════════ */
function HeroGallery({ slides = INITIAL_SLIDES, interval = AUTO_INTERVAL }) {
  const [mainSlide, setMainSlide] = useState(slides[0]);
  const [thumbs, setThumbs] = useState(slides.slice(1));
  const [activeIdx, setActiveIdx] = useState(null);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [fading, setFading] = useState(false);

  const rafRef = useRef(null);
  const startRef = useRef(null);
  const stateRef = useRef({ paused, progress, activeIdx, mainSlide, thumbs });

  useEffect(() => {
    stateRef.current = { paused, progress, activeIdx, mainSlide, thumbs };
  });

  const transitionTo = useCallback((newMain, newThumbs, newActiveIdx) => {
    setFading(true);
    setTimeout(() => {
      setMainSlide(newMain);
      setThumbs(newThumbs);
      setActiveIdx(newActiveIdx);
      setProgress(0);
      startRef.current = null;
      setFading(false);
    }, 220);
  }, []);

  const onThumbClick = useCallback(
    (thumbIdx) => {
      const { mainSlide: curMain, thumbs: curThumbs } = stateRef.current;
      const clicked = curThumbs[thumbIdx];
      const newThumbs = [...curThumbs];
      newThumbs[thumbIdx] = curMain;
      transitionTo(clicked, newThumbs, thumbIdx);
    },
    [transitionTo],
  );

  useEffect(() => {
    if (thumbs.length === 0) return;

    const tick = (ts) => {
      const { paused: isPaused } = stateRef.current;
      if (!isPaused) {
        if (!startRef.current) startRef.current = ts;
        const pct = Math.min((ts - startRef.current) / interval, 1);
        setProgress(pct);

        if (pct >= 1) {
          const {
            mainSlide: curMain,
            thumbs: curThumbs,
            activeIdx: curActive,
          } = stateRef.current;
          const nextIdx =
            curActive === null ? 0 : (curActive + 1) % curThumbs.length;
          const nextThumb = curThumbs[nextIdx];
          const newThumbs = [...curThumbs];
          newThumbs[nextIdx] = curMain;

          setFading(true);
          setTimeout(() => {
            setMainSlide(nextThumb);
            setThumbs(newThumbs);
            setActiveIdx(nextIdx);
            setProgress(0);
            startRef.current = null;
            setFading(false);
          }, 220);

          return;
        }
      } else {
        startRef.current = null;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interval, thumbs.length, paused]);

  return (
    <div
      className="flex flex-col gap-2.5 w-full select-none"
      style={{ maxWidth: 520 }}
    >
      {/* ── MAIN DISPLAY ── */}
      <div
        className="relative w-full overflow-hidden rounded-2xl border border-app bg-surface-2"
        style={{
          aspectRatio: "16 / 9",
          boxShadow:
            "0 24px 64px rgba(0,0,0,0.18), 0 0 0 1px hsl(var(--app-border)/0.4)",
        }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <AnimatePresence mode="wait">
          <motion.img
            key={mainSlide.src}
            src={mainSlide.src}
            alt={mainSlide.label}
            loading="lazy"
            decoding="async"
            initial={{ opacity: 0 }}
            animate={{ opacity: fading ? 0 : 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="absolute inset-0 h-full w-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        </AnimatePresence>

        {/* Gradient */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, hsl(var(--bg) / 0.65) 0%, transparent 50%)",
          }}
        />

        {/* Label */}
        <AnimatePresence mode="wait">
          <motion.div
            key={mainSlide.label}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
            className="absolute bottom-3 left-4 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold backdrop-blur-md border"
            style={{
              background: "hsl(var(--bg) / 0.78)",
              borderColor: "hsl(var(--app-border) / 0.35)",
              color: "hsl(var(--main))",
            }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full animate-pulse"
              style={{ background: "hsl(var(--primary))" }}
            />
            {mainSlide.label}
          </motion.div>
        </AnimatePresence>

        {/* Paused badge */}
        <AnimatePresence>
          {paused && (
            <motion.span
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              className="absolute top-3 right-3 rounded-md px-2.5 py-1 text-[10px] font-semibold backdrop-blur-sm border border-app"
              style={{
                background: "hsl(var(--bg) / 0.72)",
                color: "hsl(var(--muted))",
              }}
            >
              Paused
            </motion.span>
          )}
        </AnimatePresence>

        {/* Progress bar */}
        {thumbs.length > 0 && (
          <div
            className="absolute bottom-0 left-0 right-0 h-[3px]"
            style={{ background: "hsl(var(--app-border) / 0.4)" }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{
                background: "hsl(var(--primary))",
                width: `${progress * 100}%`,
              }}
              transition={{ ease: "linear" }}
            />
          </div>
        )}
      </div>

      {/* ── THUMBNAIL ROW — 4 equal squares ──
           flex-1 on each thumb means they share the full container width equally.
           aspect-ratio 1/1 keeps every thumb a perfect square.
      ── */}
      {thumbs.length > 0 && (
        <div className="flex w-full gap-2.5">
          {thumbs.map((thumb, i) => (
            <motion.button
              key={`${thumb.src}-${i}`}
              onClick={() => onThumbClick(i)}
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 300, damping: 22 }}
              className="relative flex-1 overflow-hidden focus:outline-none focus-visible:ring-2"
              style={{
                aspectRatio: "1 / 1",
                borderRadius: 12,
                borderStyle: "solid",
                borderWidth: activeIdx === i ? 2 : 1.5,
                borderColor:
                  activeIdx === i
                    ? "hsl(var(--primary))"
                    : "hsl(var(--app-border))",
                background: "hsl(var(--surface-2))",
                cursor: "pointer",
                boxShadow:
                  activeIdx === i
                    ? "0 0 0 3px hsl(var(--primary) / 0.15)"
                    : "none",
                transition: "border-color 0.2s, box-shadow 0.2s",
              }}
              aria-label={`View ${thumb.label}`}
            >
              <img
                src={thumb.src}
                alt={thumb.label}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover"
                style={{
                  opacity: activeIdx === i ? 1 : 0.82,
                  transition: "opacity 0.2s",
                }}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />

              {/* Gradient */}
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "linear-gradient(to top, hsl(var(--bg) / 0.58) 0%, transparent 60%)",
                }}
              />

              {/* Active tint */}
              <AnimatePresence>
                {activeIdx === i && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0"
                    style={{
                      background: "hsl(var(--primary) / 0.14)",
                      borderRadius: "inherit",
                      pointerEvents: "none",
                    }}
                  />
                )}
              </AnimatePresence>

              {/* Label */}
              <span
                className="absolute bottom-1.5 left-0 right-0 text-center text-[9px] font-bold tracking-wide drop-shadow"
                style={{ color: "hsl(var(--bg))" }}
              >
                {thumb.label}
              </span>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}
