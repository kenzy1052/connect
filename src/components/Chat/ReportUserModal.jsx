import { useState } from "react";
import { X, Flag } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { useToast } from "../../context/ToastContext";

const REASONS = [
  { value: "harassment", label: "Harassment or abusive messages" },
  { value: "scam", label: "Scam or fraudulent behaviour" },
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "spam", label: "Spam or unwanted messages" },
  { value: "impersonation", label: "Impersonation" },
  { value: "other", label: "Other" },
];

/**
 * Report User — feeds into the same `reports` table the admin panel
 * already reads from (Adminreportstab.jsx / AdminReportsPage.jsx).
 * `reports.listing_id` is NOT NULL, so we attach the listing the
 * conversation is about; `details` carries the fact that this was a
 * user report (not a listing report) plus the reported user's id, so
 * admins reviewing it can tell at a glance.
 */
export default function ReportUserModal({
  otherUserId,
  otherUserName,
  listingId,
  onClose,
}) {
  const toast = useToast();
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!reason) {
      toast.warn("Please select a reason for your report.");
      return;
    }
    if (!listingId) {
      toast.error("Cannot report: no listing context for this conversation.");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("You must be signed in to report a user.");
      return;
    }

    setLoading(true);
    const note = `[User report — ${otherUserName || "user"} (${otherUserId})]${
      details.trim() ? " " + details.trim() : ""
    }`;
    const { error } = await supabase.from("reports").insert({
      listing_id: listingId,
      reporter_id: user.id,
      reason,
      details: note,
    });
    setLoading(false);

    if (error) {
      toast.error("Failed to submit report. Please try again.");
      return;
    }

    toast.success("Report submitted. Our team will review it shortly.");
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-sm premium-card p-6 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Report user"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-md text-faint hover:text-main transition-colors"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        <div className="w-11 h-11 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center mb-4">
          <Flag size={20} />
        </div>

        <h3 className="text-base font-bold text-main mb-1">Report user</h3>
        {otherUserName && (
          <p className="text-sm text-muted leading-relaxed mb-1">
            Reporting <span className="font-semibold text-main">{otherUserName}</span>
          </p>
        )}

        <div className="mt-3 rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-2.5">
          <p className="text-xs text-amber-400/90 leading-relaxed">
            <span className="font-bold">False reports are penalised.</span>{" "}
            Only report genuine violations.
          </p>
        </div>

        <p className="text-xs font-semibold text-muted mt-4 mb-2">
          Why are you reporting this user?
        </p>
        <div className="flex flex-col gap-1.5">
          {REASONS.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setReason(r.value)}
              className={
                "flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs text-left border transition-all " +
                (reason === r.value
                  ? "border-[hsl(var(--primary))] bg-brand-soft text-main"
                  : "border-app bg-surface-2 text-muted hover:text-main")
              }
            >
              <span
                className={
                  "w-3.5 h-3.5 rounded-full border shrink-0 grid place-items-center " +
                  (reason === r.value ? "border-[hsl(var(--primary))]" : "border-app")
                }
              >
                {reason === r.value && (
                  <span className="w-1.5 h-1.5 rounded-full bg-brand" />
                )}
              </span>
              {r.label}
            </button>
          ))}
        </div>

        <p className="text-xs font-semibold text-muted mt-4 mb-1.5">
          Additional details <span className="opacity-50 font-normal">(optional)</span>
        </p>
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="Tell us more about the issue…"
          maxLength={500}
          rows={3}
          className="w-full bg-surface-2 border border-app rounded-xl px-3 py-2 text-xs text-main placeholder:text-faint outline-none focus:border-[hsl(var(--primary))] transition-all resize-none"
        />
        <p className="text-[10px] text-faint text-right mt-1">{details.length}/500</p>

        <div className="flex gap-3 mt-5">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-surface-2 hover:bg-surface-hover text-main transition-colors border border-app"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !reason}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold bg-red-600 hover:bg-red-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Submitting…" : "Submit report"}
          </button>
        </div>
      </div>
    </div>
  );
}
