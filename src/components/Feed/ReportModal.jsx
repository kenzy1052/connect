import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useToast } from "../../context/ToastContext";

const REASONS = [
  { value: "spam", label: "Spam or misleading" },
  { value: "fake", label: "Fake or counterfeit item" },
  { value: "prohibited", label: "Prohibited item" },
  { value: "wrong_price", label: "Incorrect / fraudulent pricing" },
  { value: "already_sold", label: "Already sold but still listed" },
  { value: "other", label: "Other" },
];

export default function ReportModal({
  listing,
  listingId: listingIdProp,
  listingTitle: listingTitleProp,
  onClose,
  onSuccess,
}) {
  // Accept either a full listing object OR individual id/title props
  const listingId = listing?.id ?? listingIdProp ?? null;
  const listingTitle = listing?.title ?? listingTitleProp ?? null;

  const toast = useToast();
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    // ── Guard: listing must be identified ──────────────────────────
    if (!listingId) {
      toast.error("Cannot report: listing ID is missing.");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("You must be signed in to report a listing.");
      return;
    }
    if (!user.email_confirmed_at) {
      toast.warn(
        "Please verify your email address before submitting a report.",
        { autoDismiss: false },
      );
      return;
    }
    if (!reason) {
      toast.warn("Please select a reason for your report.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("reports").insert({
      listing_id: listingId,
      reporter_id: user.id,
      reason,
      details: details.trim() || null,
    });

    setLoading(false);

    if (error) {
      if (error.code === "23502") {
        toast.error(
          "Report failed: listing reference is missing. Please try again.",
        );
      } else if (error.code === "23503") {
        toast.error("Report failed: this listing no longer exists.");
      } else {
        toast.error("Failed to submit report. Please try again.");
      }
      return;
    }

    toast.success("Report submitted. Our team will review it shortly.");
    onSuccess?.();
    onClose();
  }

  return (
    <div
      style={styles.backdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label="Report listing"
      >
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>Report listing</h2>
            {listingTitle && <p style={styles.subtitle}>"{listingTitle}"</p>}
          </div>
          <button style={styles.closeBtn} onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {/* Warning banner */}
        <div style={styles.warningBanner}>
          <span style={styles.warningIcon}>⚠</span>
          <p style={styles.warningText}>
            <span style={styles.warningBold}>False reports are penalised.</span>{" "}
            Submitting a report that is found to be false or abusive will result
            in a reduction of your trust score. Only report genuine violations.
          </p>
        </div>

        <div style={styles.body}>
          <p style={styles.label}>Why are you reporting this listing?</p>
          <div style={styles.reasonList}>
            {REASONS.map((r) => (
              <button
                key={r.value}
                style={{
                  ...styles.reasonBtn,
                  ...(reason === r.value ? styles.reasonBtnActive : {}),
                }}
                onClick={() => setReason(r.value)}
              >
                <span style={styles.radioCircle}>
                  {reason === r.value && <span style={styles.radioDot} />}
                </span>
                {r.label}
              </button>
            ))}
          </div>

          <p style={{ ...styles.label, marginTop: 20 }}>
            Additional details <span style={{ opacity: 0.45 }}>(optional)</span>
          </p>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Tell us more about the issue…"
            maxLength={500}
            rows={3}
            style={styles.textarea}
          />
          <p style={styles.charCount}>{details.length}/500</p>
        </div>

        <div style={styles.footer}>
          <button style={styles.cancelBtn} onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            style={{
              ...styles.submitBtn,
              opacity: loading || !reason ? 0.55 : 1,
              cursor: loading || !reason ? "not-allowed" : "pointer",
            }}
            onClick={handleSubmit}
            disabled={loading || !reason}
          >
            {loading ? "Submitting…" : "Submit Report"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Inline styles (unchanged from original) ──────────────────── */
const styles = {
  backdrop: {
    position: "fixed",
    inset: 0,
    zIndex: 1000,
    backgroundColor: "rgba(0,0,0,0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "1rem",
  },
  modal: {
    background: "#0f172a",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "1.25rem",
    width: "100%",
    maxWidth: 480,
    boxShadow: "0 25px 60px rgba(0,0,0,0.6)",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    padding: "1.25rem 1.5rem 1rem",
    borderBottom: "1px solid rgba(255,255,255,0.07)",
  },
  title: {
    margin: 0,
    fontSize: "1.125rem",
    fontWeight: 800,
    color: "#f1f5f9",
    letterSpacing: "-0.01em",
  },
  subtitle: {
    margin: "0.25rem 0 0",
    fontSize: "0.75rem",
    color: "#94a3b8",
    fontStyle: "italic",
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "#64748b",
    cursor: "pointer",
    fontSize: "1rem",
    padding: "0.25rem",
    lineHeight: 1,
    borderRadius: "0.375rem",
  },
  warningBanner: {
    display: "flex",
    gap: "0.75rem",
    alignItems: "flex-start",
    background: "rgba(245,158,11,0.08)",
    borderTop: "none",
    borderBottom: "1px solid rgba(245,158,11,0.15)",
    padding: "0.75rem 1.5rem",
  },
  warningIcon: {
    fontSize: "0.875rem",
    color: "#f59e0b",
    flexShrink: 0,
    marginTop: 1,
  },
  warningText: {
    margin: 0,
    fontSize: "0.75rem",
    color: "#94a3b8",
    lineHeight: 1.5,
  },
  warningBold: {
    color: "#f59e0b",
    fontWeight: 700,
  },
  body: {
    padding: "1.25rem 1.5rem",
  },
  label: {
    margin: "0 0 0.75rem",
    fontSize: "0.8125rem",
    fontWeight: 600,
    color: "#cbd5e1",
  },
  reasonList: {
    display: "flex",
    flexDirection: "column",
    gap: "0.375rem",
  },
  reasonBtn: {
    display: "flex",
    alignItems: "center",
    gap: "0.625rem",
    padding: "0.625rem 0.875rem",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: "0.625rem",
    background: "rgba(255,255,255,0.03)",
    color: "#94a3b8",
    cursor: "pointer",
    fontSize: "0.8125rem",
    textAlign: "left",
    transition: "all 0.15s",
  },
  reasonBtnActive: {
    borderColor: "rgba(99,102,241,0.5)",
    background: "rgba(99,102,241,0.08)",
    color: "#e2e8f0",
  },
  radioCircle: {
    width: 14,
    height: 14,
    borderRadius: "50%",
    border: "1.5px solid rgba(255,255,255,0.2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  radioDot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: "#6366f1",
    display: "block",
  },
  textarea: {
    width: "100%",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "0.625rem",
    color: "#e2e8f0",
    fontSize: "0.8125rem",
    padding: "0.625rem 0.75rem",
    resize: "vertical",
    boxSizing: "border-box",
    outline: "none",
    fontFamily: "inherit",
  },
  charCount: {
    margin: "0.25rem 0 0",
    fontSize: "0.6875rem",
    color: "#475569",
    textAlign: "right",
  },
  footer: {
    display: "flex",
    gap: "0.75rem",
    justifyContent: "flex-end",
    padding: "1rem 1.5rem",
    borderTop: "1px solid rgba(255,255,255,0.07)",
  },
  cancelBtn: {
    padding: "0.625rem 1.25rem",
    borderRadius: "0.625rem",
    border: "1px solid rgba(255,255,255,0.1)",
    background: "transparent",
    color: "#94a3b8",
    cursor: "pointer",
    fontSize: "0.8125rem",
    fontWeight: 600,
  },
  submitBtn: {
    padding: "0.625rem 1.25rem",
    borderRadius: "0.625rem",
    border: "none",
    background: "#6366f1",
    color: "#fff",
    fontSize: "0.8125rem",
    fontWeight: 700,
    letterSpacing: "0.01em",
  },
};
