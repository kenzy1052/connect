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

export default function ReportModal({ listingId, listingTitle, onClose }) {
  const toast = useToast();
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    /* ── Verification gate ── */
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

    /* ── Submit ── */
    setLoading(true);

    const { error } = await supabase.from("reports").insert({
      listing_id: listingId,
      reporter_id: user.id,
      reason,
      details: details.trim() || null,
    });

    setLoading(false);

    if (error) {
      console.error("Report error:", error);
      toast.error("Failed to submit report. Please try again.");
      return;
    }

    toast.success("Report submitted. Our team will review it shortly.");
    onClose();
  }

  return (
    /* Backdrop */
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
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>Report listing</h2>
            {listingTitle && <p style={styles.subtitle}>"{listingTitle}"</p>}
          </div>
          <button style={styles.closeBtn} onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {/* Reason picker */}
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

          {/* Extra details */}
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

        {/* Footer */}
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
            {loading ? "Submitting…" : "Submit report"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Styles ─── */
const styles = {
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.65)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: 16,
    backdropFilter: "blur(4px)",
  },
  modal: {
    background: "#1a1a1a",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 16,
    width: "100%",
    maxWidth: 460,
    overflow: "hidden",
    boxShadow: "0 24px 48px rgba(0,0,0,0.6)",
    animation: "slideUp 0.2s ease",
  },
  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    padding: "20px 20px 16px",
    borderBottom: "1px solid rgba(255,255,255,0.07)",
  },
  title: {
    margin: 0,
    fontSize: 17,
    fontWeight: 700,
    color: "#f1f1f1",
  },
  subtitle: {
    margin: "3px 0 0",
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
    maxWidth: 300,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  closeBtn: {
    background: "rgba(255,255,255,0.07)",
    border: "none",
    borderRadius: 8,
    color: "rgba(255,255,255,0.6)",
    cursor: "pointer",
    fontSize: 14,
    padding: "6px 10px",
    lineHeight: 1,
    transition: "background 0.15s",
  },
  body: {
    padding: "18px 20px 4px",
  },
  label: {
    margin: "0 0 10px",
    fontSize: 13,
    fontWeight: 600,
    color: "rgba(255,255,255,0.75)",
  },
  reasonList: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  reasonBtn: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.03)",
    color: "rgba(255,255,255,0.65)",
    cursor: "pointer",
    textAlign: "left",
    fontSize: 13.5,
    transition: "background 0.15s, border-color 0.15s",
  },
  reasonBtnActive: {
    background: "rgba(59,130,246,0.12)",
    borderColor: "rgba(59,130,246,0.5)",
    color: "#93c5fd",
  },
  radioCircle: {
    width: 16,
    height: 16,
    borderRadius: "50%",
    border: "2px solid rgba(255,255,255,0.25)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#3b82f6",
  },
  textarea: {
    width: "100%",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 10,
    color: "#f1f1f1",
    fontSize: 13,
    padding: "10px 12px",
    resize: "vertical",
    fontFamily: "'Inter', sans-serif",
    lineHeight: 1.5,
    boxSizing: "border-box",
    outline: "none",
  },
  charCount: {
    margin: "4px 0 0",
    fontSize: 11,
    color: "rgba(255,255,255,0.3)",
    textAlign: "right",
  },
  footer: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    padding: "16px 20px 20px",
    borderTop: "1px solid rgba(255,255,255,0.07)",
  },
  cancelBtn: {
    padding: "10px 18px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.1)",
    background: "transparent",
    color: "rgba(255,255,255,0.6)",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 500,
    transition: "background 0.15s",
  },
  submitBtn: {
    padding: "10px 20px",
    borderRadius: 10,
    border: "none",
    background: "#ef4444",
    color: "#fff",
    fontWeight: 600,
    fontSize: 14,
    transition: "opacity 0.15s",
  },
};
