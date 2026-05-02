// src/context/ToastContext.jsx
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";

const ToastContext = createContext(null);

let idCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message, type = "info", options = {}) => {
    const id = ++idCounter;
    setToasts((prev) => [...prev, { id, message, type, ...options }]);
    return id;
  }, []);

  const toast = {
    success: (msg, opts) => addToast(msg, "success", opts),
    error: (msg, opts) => addToast(msg, "error", opts),
    info: (msg, opts) => addToast(msg, "info", opts),
    warn: (msg, opts) => addToast(msg, "warn", opts),
    dismiss,
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

// ─── Individual Toast ────────────────────────────────────────────────────────

function ToastItem({ toast, onDismiss }) {
  const { id, message, type, autoDismiss = true } = toast;
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef(null);

  const handleDismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => onDismiss(id), 220);
  }, [id, onDismiss]);

  useEffect(() => {
    if (!autoDismiss) return;
    timerRef.current = setTimeout(handleDismiss, 4500);
    return () => clearTimeout(timerRef.current);
  }, [autoDismiss, handleDismiss]);

  const icons = {
    success: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path
          d="M13 4L6.5 11.5L3 8"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    error: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path
          d="M8 5v4M8 11v.5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M6.8 2.5L1.5 12a1.4 1.4 0 0 0 1.2 2h10.6a1.4 1.4 0 0 0 1.2-2L9.2 2.5a1.4 1.4 0 0 0-2.4 0z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </svg>
    ),
    warn: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path
          d="M8 5v4M8 11v.5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M6.8 2.5L1.5 12a1.4 1.4 0 0 0 1.2 2h10.6a1.4 1.4 0 0 0 1.2-2L9.2 2.5a1.4 1.4 0 0 0-2.4 0z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </svg>
    ),
    info: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M8 7.5v4M8 5v.5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  };

  return (
    <div
      data-type={type}
      data-exiting={exiting}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "11px 14px",
        borderRadius: "10px",
        fontSize: "14px",
        fontWeight: "500",
        lineHeight: "1.4",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.28), 0 1px 3px rgba(0,0,0,0.2)",
        border: "1px solid",
        minWidth: "260px",
        maxWidth: "380px",
        animation: exiting
          ? "toast-out 0.22s ease forwards"
          : "toast-in 0.25s cubic-bezier(0.34,1.56,0.64,1) forwards",
        // Colors adapt to type via CSS custom properties from ThemeContext
        backgroundColor: "var(--toast-bg, rgba(30,30,30,0.92))",
        color: "var(--toast-color, #fff)",
        borderColor: "var(--toast-border, rgba(255,255,255,0.12))",
      }}
    >
      {/* Icon */}
      <span
        style={{
          flexShrink: 0,
          opacity: 0.9,
          color: TYPE_ACCENT[type],
        }}
      >
        {icons[type]}
      </span>

      {/* Message */}
      <span style={{ flex: 1 }}>{message}</span>

      {/* Dismiss button — styled as text link, matching screenshot */}
      <button
        onClick={handleDismiss}
        aria-label="Dismiss"
        style={{
          flexShrink: 0,
          background: "none",
          border: "none",
          padding: "2px 4px",
          marginLeft: "4px",
          cursor: "pointer",
          fontSize: "13px",
          fontWeight: "600",
          color: TYPE_ACCENT[type],
          opacity: 0.85,
          letterSpacing: "0.01em",
          borderRadius: "4px",
          transition: "opacity 0.15s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.85")}
      >
        Dismiss
      </button>
    </div>
  );
}

const TYPE_ACCENT = {
  success: "#4ade80",
  error: "#f87171",
  warn: "#fbbf24",
  info: "#60a5fa",
};

// ─── Toast Container ─────────────────────────────────────────────────────────

function ToastContainer({ toasts, onDismiss }) {
  return (
    <>
      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(8px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
        @keyframes toast-out {
          from { opacity: 1; transform: translateY(0) scale(1); }
          to   { opacity: 0; transform: translateY(6px) scale(0.95); }
        }
      `}</style>
      <div
        aria-live="polite"
        aria-atomic="false"
        style={{
          position: "fixed",
          bottom: "24px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          alignItems: "center",
          pointerEvents: "none",
        }}
      >
        {toasts.map((t) => (
          <div key={t.id} style={{ pointerEvents: "auto" }}>
            <ToastItem toast={t} onDismiss={onDismiss} />
          </div>
        ))}
      </div>
    </>
  );
}
