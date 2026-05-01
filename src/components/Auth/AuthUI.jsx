import { useState, useEffect, useRef } from "react";
import { motion, useMotionValue, useTransform, useSpring } from "framer-motion";

// ── Parallax image panel that follows the mouse ───────────────────────────────
function ParallaxPanel() {
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);

  const springCfg = { stiffness: 55, damping: 20, mass: 1.2 };
  const x = useSpring(rawX, springCfg);
  const y = useSpring(rawY, springCfg);

  const imgX = useTransform(x, [-1, 1], ["-3%", "3%"]);
  const imgY = useTransform(y, [-1, 1], ["-3%", "3%"]);

  useEffect(() => {
    const onMove = (e) => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      rawX.set((e.clientX / w) * 2 - 1);
      rawY.set((e.clientY / h) * 2 - 1);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [rawX, rawY]);

  return (
    <div
      className="hidden lg:block lg:w-1/2 relative overflow-hidden select-none"
      style={{ background: "hsl(var(--bg))" }}
    >
      {/* Parallax image — slightly oversize so edges stay hidden during motion */}
      <motion.div
        style={{ x: imgX, y: imgY }}
        className="absolute inset-[-4%] w-[108%] h-[108%]"
      >
        <motion.img
          initial={{ scale: 1.06, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
          src="https://images.pexels.com/photos/1438081/pexels-photo-1438081.jpeg?auto=compress&cs=tinysrgb&w=1600"
          alt="Students on campus"
          className="w-full h-full object-cover"
          draggable={false}
        />
      </motion.div>

      {/* Dark gradient overlay — uses theme bg so it transitions smoothly */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(135deg, hsl(var(--bg) / 0.88) 0%, hsl(var(--bg) / 0.6) 50%, hsl(var(--bg) / 0.18) 100%)",
        }}
      />

      {/* Editorial copy pinned to bottom-left */}
      <div className="absolute inset-0 flex flex-col justify-end p-14 z-10">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          <span
            className="inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase mb-5"
            style={{
              letterSpacing: "0.18em",
              background: "hsl(var(--primary) / 0.16)",
              color: "hsl(var(--primary))",
              border: "1px solid hsl(var(--primary) / 0.3)",
            }}
          >
            UCC Student Marketplace
          </span>

          <h2
            className="text-5xl font-black leading-[1.07] tracking-tight"
            style={{ color: "hsl(var(--text))" }}
          >
            Connect.
            <br />
            Trade.
            <br />
            <span style={{ color: "hsl(var(--primary))" }}>Grow.</span>
          </h2>

          <p
            className="mt-5 text-sm font-medium max-w-[26ch] leading-relaxed"
            style={{ color: "hsl(var(--text-muted))" }}
          >
            Buy, sell, and discover everything on campus — from textbooks to
            talent.
          </p>

          {/* Stat pills */}
          <motion.div
            className="flex gap-3 mt-8 flex-wrap"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.72, duration: 0.7 }}
          >
            {[
              { label: "Students", value: "12k+" },
              { label: "Listings", value: "4.8k" },
              { label: "Trades / mo", value: "2.1k" },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl px-4 py-2.5 text-center"
                style={{
                  background: "hsl(var(--surface) / 0.68)",
                  border: "1px solid hsl(var(--border))",
                  backdropFilter: "blur(14px)",
                  WebkitBackdropFilter: "blur(14px)",
                }}
              >
                <p
                  className="text-lg font-black leading-none"
                  style={{ color: "hsl(var(--primary))" }}
                >
                  {s.value}
                </p>
                <p
                  className="text-[10px] font-semibold mt-0.5"
                  style={{ color: "hsl(var(--text-faint))" }}
                >
                  {s.label}
                </p>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

// ── Split-Screen Auth Layout ──────────────────────────────────────────────────
export function AuthLayout({ children, title, subtitle }) {
  return (
    <div className="flex min-h-screen" style={{ background: "hsl(var(--bg))" }}>
      <ParallaxPanel />

      {/* Form panel */}
      <div
        className="w-full lg:w-1/2 flex flex-col justify-center items-center px-8 py-14 md:px-16"
        style={{ background: "hsl(var(--bg))" }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[420px]"
        >
          {/* Logo mark */}
          <div className="mb-10">
            <motion.div
              className="w-11 h-11 rounded-xl flex items-center justify-center mb-6"
              style={{
                background:
                  "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-2)))",
                boxShadow: "0 10px 28px hsl(var(--primary) / 0.3)",
              }}
              whileHover={{ scale: 1.07 }}
              whileTap={{ scale: 0.95 }}
            >
              <span
                className="font-black text-lg"
                style={{ color: "hsl(var(--primary-fg))" }}
              >
                C
              </span>
            </motion.div>

            <h1
              className="text-4xl font-black tracking-tight leading-tight"
              style={{ color: "hsl(var(--text))" }}
            >
              {title}
            </h1>
            <p
              className="mt-2 text-sm font-medium"
              style={{ color: "hsl(var(--text-muted))" }}
            >
              {subtitle}
            </p>
          </div>

          <div className="space-y-5">{children}</div>

          <p
            className="mt-12 text-[10px] font-bold uppercase"
            style={{
              color: "hsl(var(--text-faint))",
              letterSpacing: "0.16em",
            }}
          >
            Exclusively for UCC students &amp; staff
          </p>
        </motion.div>
      </div>
    </div>
  );
}

// ── Field Primitive ───────────────────────────────────────────────────────────
export function Field({ label, error, children }) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label
          className="block text-[10px] font-black uppercase ml-0.5"
          style={{ color: "hsl(var(--text-faint))", letterSpacing: "0.16em" }}
        >
          {label}
        </label>
      )}
      {children}
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -3 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[11px] font-semibold ml-0.5"
          style={{ color: "hsl(var(--danger))" }}
        >
          {error}
        </motion.p>
      )}
    </div>
  );
}

// ── Input Primitive ───────────────────────────────────────────────────────────
export function Input({ onFocus, onBlur, className = "", ...props }) {
  const ref = useRef(null);

  const handleFocus = (e) => {
    if (ref.current) {
      ref.current.style.borderColor = "hsl(var(--primary))";
      ref.current.style.boxShadow = "0 0 0 3px hsl(var(--primary) / 0.15)";
    }
    onFocus?.(e);
  };

  const handleBlur = (e) => {
    if (ref.current) {
      ref.current.style.borderColor = "hsl(var(--border))";
      ref.current.style.boxShadow = "none";
    }
    onBlur?.(e);
  };

  return (
    <input
      ref={ref}
      {...props}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={`w-full px-4 py-3.5 text-sm font-medium rounded-xl outline-none transition-all ${className}`}
      style={{
        background: "hsl(var(--surface-2))",
        border: "1px solid hsl(var(--border))",
        color: "hsl(var(--text))",
        caretColor: "hsl(var(--primary))",
      }}
    />
  );
}

// ── Password Input ────────────────────────────────────────────────────────────
export function PasswordInput({ ...props }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={show ? "text" : "password"} />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] font-bold transition-colors"
        style={{ color: "hsl(var(--text-faint))" }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "hsl(var(--text))")}
        onMouseLeave={(e) =>
          (e.currentTarget.style.color = "hsl(var(--text-faint))")
        }
      >
        {show ? "Hide" : "Show"}
      </button>
    </div>
  );
}

// ── Primary Button ────────────────────────────────────────────────────────────
export function PrimaryButton({ loading, children, ...props }) {
  return (
    <motion.button
      whileHover={{ scale: 1.015, filter: "brightness(1.06)" }}
      whileTap={{ scale: 0.975 }}
      {...props}
      className="w-full py-3.5 px-6 rounded-xl font-black text-[11px] uppercase flex items-center justify-center gap-2 transition-opacity"
      style={{
        background:
          "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-2)))",
        color: "hsl(var(--primary-fg))",
        boxShadow: "0 8px 24px hsl(var(--primary) / 0.3)",
        letterSpacing: "0.14em",
        opacity: loading ? 0.82 : 1,
      }}
    >
      {loading ? (
        <div
          className="w-4 h-4 rounded-full border-2 animate-spin"
          style={{
            borderColor: "hsl(var(--primary-fg) / 0.25)",
            borderTopColor: "hsl(var(--primary-fg))",
          }}
        />
      ) : (
        children
      )}
    </motion.button>
  );
}

// ── Error Banner ──────────────────────────────────────────────────────────────
export function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-4 py-3 rounded-xl text-sm font-medium"
      style={{
        background: "hsl(var(--danger) / 0.1)",
        border: "1px solid hsl(var(--danger) / 0.28)",
        color: "hsl(var(--danger))",
      }}
    >
      {message}
    </motion.div>
  );
}

// ── Success Banner ────────────────────────────────────────────────────────────
export function SuccessBanner({ message }) {
  if (!message) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-4 py-3 rounded-xl text-sm font-medium"
      style={{
        background: "hsl(var(--success) / 0.1)",
        border: "1px solid hsl(var(--success) / 0.28)",
        color: "hsl(var(--success))",
      }}
    >
      {message}
    </motion.div>
  );
}

// ── UCC Email Validator ───────────────────────────────────────────────────────
export function validateUCCEmail(email) {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return "Email is required.";
  if (
    !trimmed.endsWith("@stu.ucc.edu.gh") &&
    !trimmed.endsWith("@ucc.edu.gh")
  ) {
    return "Only UCC institutional emails are allowed.";
  }
  return "";
}
