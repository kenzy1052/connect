import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Search, ShieldCheck, Sparkles } from "lucide-react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  AnimatePresence,
} from "framer-motion";

const CAROUSEL_IMAGES = [
  "/1.jpg",
  "/2.jpg",
  "/3.jpg",
  "/4.jpg",
  "/5.jpg",
  "/6.jpg",
];

export default function HeroSection() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const visualX = useSpring(useTransform(pointerX, [-0.5, 0.5], [-10, 10]), {
    stiffness: 70,
    damping: 26,
  });
  const visualY = useSpring(useTransform(pointerY, [-0.5, 0.5], [-7, 7]), {
    stiffness: 70,
    damping: 26,
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
      style={{ height: "100svh", maxHeight: "100svh" }}
    >
      {/* Subtle ambient glow — no geometric shapes */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-app" />
        <div
          className="absolute -top-24 right-0 h-[480px] w-[480px] rounded-full opacity-40"
          style={{
            background:
              "radial-gradient(circle, hsl(var(--primary) / 0.14), transparent 70%)",
            filter: "blur(48px)",
          }}
        />
        <div
          className="absolute bottom-0 left-0 h-[360px] w-[360px] rounded-full opacity-30"
          style={{
            background:
              "radial-gradient(circle, hsl(var(--primary-2) / 0.12), transparent 70%)",
            filter: "blur(56px)",
          }}
        />
      </div>

      <div
        className="mx-auto grid h-full max-w-7xl items-center gap-8 px-4 sm:px-6 lg:grid-cols-[1fr_1fr] lg:gap-10"
        style={{ paddingTop: "1rem", paddingBottom: "2rem" }}
      >
        {/* LEFT */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: {
              transition: { staggerChildren: 0.09, delayChildren: 0.04 },
            },
          }}
          className="flex flex-col justify-center max-w-lg"
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
            className="mt-3 text-sm leading-relaxed text-muted sm:text-[0.95rem]"
          >
            CampusConnect is the marketplace built for UCC students — buy, sell
            and discover phones, textbooks, hostels, services, and more from
            people you actually know.
          </motion.p>

          {/* Search */}
          <motion.form
            variants={itemVariant}
            onSubmit={submit}
            className="mt-6 w-full"
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
            className="mt-4 flex flex-wrap items-center gap-2.5"
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

        {/* RIGHT — Carousel only */}
        <motion.div
          style={{ x: visualX, y: visualY }}
          className="relative flex h-full max-h-[560px] w-full items-center justify-center"
        >
          <HeroCarousel images={CAROUSEL_IMAGES} />
        </motion.div>
      </div>
    </section>
  );
}

const itemVariant = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.52, ease: [0.22, 1, 0.36, 1] },
  },
};

/**
 * Full-featured hero carousel — large center card flanked by peeking side cards.
 * Smooth Framer Motion springs. Auto-advances. Clickable.
 */
function HeroCarousel({ images }) {
  const [active, setActive] = useState(0);
  const len = images.length;
  const timerRef = useRef(null);

  const resetTimer = () => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setActive((i) => (i + 1) % len), 3400);
  };

  useEffect(() => {
    resetTimer();
    return () => clearInterval(timerRef.current);
  }, [len]);

  const goTo = (i) => {
    setActive(i);
    resetTimer();
  };

  const prev = () => goTo((active - 1 + len) % len);
  const next = () => goTo((active + 1) % len);

  // slot: -1 = left peek, 0 = center, 1 = right peek, else hidden
  const slot = (i) => {
    const diff = (i - active + len) % len;
    if (diff === 0) return 0;
    if (diff === 1) return 1;
    if (diff === len - 1) return -1;
    return 2; // hidden
  };

  const config = {
    type: "spring",
    stiffness: 200,
    damping: 28,
    mass: 0.7,
  };

  return (
    <div
      className="relative flex w-full flex-col items-center gap-4"
      style={{ height: "100%" }}
    >
      {/* Cards stage */}
      <div className="relative w-full flex-1" style={{ minHeight: 0 }}>
        {images.map((src, i) => {
          const s = slot(i);
          const isCenter = s === 0;
          const isVisible = Math.abs(s) <= 1;

          const xPct =
            s === 0
              ? "0%"
              : s === 1
                ? "55%"
                : s === -1
                  ? "-55%"
                  : s > 1
                    ? "110%"
                    : "-110%";
          const scale = isCenter ? 1 : 0.78;
          const opacity = isCenter ? 1 : isVisible ? 0.6 : 0;
          const zIndex = isCenter ? 20 : isVisible ? 10 : 0;
          const rotate = s === 0 ? 0 : s === 1 ? 3 : s === -1 ? -3 : 0;

          return (
            <motion.div
              key={src}
              onClick={() => !isCenter && goTo(i)}
              initial={false}
              animate={{ x: xPct, scale, opacity, rotate, zIndex }}
              transition={config}
              className="absolute inset-0 mx-auto overflow-hidden rounded-2xl border border-app bg-surface shadow-2xl"
              style={{
                width: "62%",
                left: "19%",
                cursor: isCenter ? "default" : "pointer",
                boxShadow: isCenter
                  ? "0 24px 64px rgba(0,0,0,0.28)"
                  : "0 8px 24px rgba(0,0,0,0.16)",
              }}
            >
              <img
                src={src}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
                style={{ display: "block" }}
                onError={(e) => {
                  e.currentTarget.parentElement.style.background =
                    "hsl(var(--surface-2))";
                  e.currentTarget.style.display = "none";
                }}
              />
              {/* Bottom gradient */}
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "linear-gradient(to top, hsl(var(--bg) / 0.55) 0%, transparent 50%)",
                }}
              />
              {/* Center badge */}
              {isCenter && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="absolute bottom-4 left-4 right-4 flex items-center justify-between"
                >
                  <span className="rounded-md bg-[hsl(var(--bg)/0.75)] px-3 py-1.5 text-xs font-semibold text-main backdrop-blur-sm">
                    Featured listing
                  </span>
                  <span className="rounded-md bg-brand px-2.5 py-1 text-[11px] font-bold text-[hsl(var(--primary-fg))]">
                    {active + 1} / {len}
                  </span>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Dot indicators */}
      <div className="flex items-center gap-2 pb-1">
        {images.map((_, i) => (
          <motion.button
            key={i}
            type="button"
            aria-label={`Slide ${i + 1}`}
            onClick={() => goTo(i)}
            animate={{
              width: i === active ? 24 : 7,
              opacity: i === active ? 1 : 0.35,
            }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="h-[7px] rounded-full"
            style={{ background: "hsl(var(--primary))" }}
          />
        ))}
      </div>
    </div>
  );
}
