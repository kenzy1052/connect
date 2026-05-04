import { useEffect, useRef } from "react";
import { AlertTriangle, Trash2, CheckCircle2, X } from "lucide-react";

/**
 * ConfirmModal — drop-in replacement for window.confirm().
 *
 * Usage:
 *   const [confirm, setConfirm] = useState(null);
 *
 *   // trigger:
 *   setConfirm({
 *     title: "Delete listing?",
 *     message: `Permanently delete "${listing.title}"? This cannot be undone.`,
 *     variant: "danger",          // "danger" | "warning" | "success" — optional, default "danger"
 *     confirmLabel: "Delete",     // optional
 *     onConfirm: () => doDelete(),
 *   });
 *
 *   // render:
 *   {confirm && <ConfirmModal {...confirm} onClose={() => setConfirm(null)} />}
 */
export default function ConfirmModal({
  title,
  message,
  variant = "danger",
  confirmLabel,
  onConfirm,
  onClose,
}) {
  const cancelRef = useRef(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Focus cancel by default (safer UX)
  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  const Icon =
    variant === "danger"
      ? Trash2
      : variant === "warning"
        ? AlertTriangle
        : CheckCircle2;

  const iconBg =
    variant === "danger"
      ? "bg-red-500/10"
      : variant === "warning"
        ? "bg-amber-500/10"
        : "bg-emerald-500/10";

  const iconColor =
    variant === "danger"
      ? "text-red-400"
      : variant === "warning"
        ? "text-amber-400"
        : "text-emerald-400";

  const btnColor =
    variant === "danger"
      ? "bg-red-600 hover:bg-red-500 text-white"
      : variant === "warning"
        ? "bg-amber-500 hover:bg-amber-400 text-black"
        : "bg-emerald-600 hover:bg-emerald-500 text-white";

  const defaultLabel =
    variant === "danger"
      ? "Delete"
      : variant === "warning"
        ? "Continue"
        : "Confirm";

  const handleConfirm = () => {
    onClose();
    onConfirm();
  };

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Dialog */}
      <div
        className="relative w-full max-w-sm premium-card p-6 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-desc"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-md text-faint hover:text-main transition-colors"
          aria-label="Cancel"
        >
          <X size={16} />
        </button>

        {/* Icon */}
        <div
          className={`w-11 h-11 rounded-xl ${iconBg} ${iconColor} flex items-center justify-center mb-4`}
        >
          <Icon size={20} />
        </div>

        {/* Text */}
        <h3 id="confirm-title" className="text-base font-bold text-main mb-1">
          {title}
        </h3>
        {message && (
          <p id="confirm-desc" className="text-sm text-muted leading-relaxed">
            {message}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            ref={cancelRef}
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-surface-2 hover:bg-surface-hover text-main transition-colors border border-app"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${btnColor}`}
          >
            {confirmLabel ?? defaultLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
