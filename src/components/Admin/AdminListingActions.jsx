import { useState } from "react";
import { Trash2, ShieldOff, ShieldCheck, AlertTriangle, EyeOff, Eye } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { useToast } from "../../context/ToastContext";
import ConfirmModal from "../UI/ConfirmModal";

/**
 * AdminListingActions — shown ONLY for admins inside ListingDetail.
 *
 * Usage in ListingDetail.jsx:
 *   import AdminListingActions from "../Admin/AdminListingActions";
 *
 *   // In the component, use:
 *   const { user, profile } = useAuth();
 *
 *   // After the Report block ({!isOwnListing && ...}), add:
 *   {profile?.role === "admin" && (
 *     <AdminListingActions
 *       listing={listingData}
 *       onDeleted={() => onBack?.()}
 *       onSuspendToggled={(suspended) =>
 *         setListingData((prev) => ({ ...prev, is_suspended: suspended }))
 *       }
 *       onHideToggled={(hidden) =>
 *         setListingData((prev) => ({ ...prev, is_hidden: hidden }))
 *       }
 *     />
 *   )}
 */
export default function AdminListingActions({ listing, onDeleted, onSuspendToggled, onHideToggled }) {
  const toast = useToast();
  const [confirm, setConfirm] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!listing?.id) return null;

  const isSuspended = listing.is_suspended ?? false;
  const isHidden    = listing.is_hidden    ?? false;

  const callRpc = async (fn, args, successMsg) => {
    setLoading(true);
    const { error } = await supabase.rpc(fn, args);
    setLoading(false);
    if (error) {
      toast.error(error.message ?? "Action failed.");
      return false;
    }
    toast.success(successMsg);
    return true;
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const doDelete = async () => {
    const ok = await callRpc(
      "admin_delete_listing",
      { p_listing_id: listing.id },
      "Listing deleted. Seller has been notified.",
    );
    if (ok) onDeleted?.();
  };

  // ── Suspend / Unsuspend ───────────────────────────────────────────────────
  const doSuspend = async () => {
    const ok = await callRpc(
      "admin_suspend_listing",
      { p_listing_id: listing.id },
      "Listing suspended. Seller has been notified.",
    );
    if (ok) onSuspendToggled?.(true);
  };

  const doUnsuspend = async () => {
    const ok = await callRpc(
      "admin_unsuspend_listing",
      { p_listing_id: listing.id },
      "Listing reinstated.",
    );
    if (ok) onSuspendToggled?.(false);
  };

  // ── Hide / Unhide ─────────────────────────────────────────────────────────
  const doHide = async () => {
    const ok = await callRpc(
      "admin_set_listing_visibility",
      { p_listing_id: listing.id, p_hidden: true },
      "Listing hidden from the marketplace.",
    );
    if (ok) onHideToggled?.(true);
  };

  const doUnhide = async () => {
    const ok = await callRpc(
      "admin_set_listing_visibility",
      { p_listing_id: listing.id, p_hidden: false },
      "Listing is now visible in the marketplace.",
    );
    if (ok) onHideToggled?.(false);
  };

  return (
    <>
      <div className="bg-slate-900 border border-red-500/20 rounded-2xl p-5 space-y-2.5">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle size={12} className="text-red-400 shrink-0" />
          <p className="text-[10px] font-black uppercase tracking-widest text-red-400">
            Admin Actions
          </p>
        </div>

        {/* ── Hide / Unhide ─────────────────────────────────────────── */}
        {isHidden ? (
          <button
            onClick={() =>
              setConfirm({
                title: "Unhide listing?",
                message: `Make "${listing.title}" visible again in the marketplace?`,
                variant: "warning",
                confirmLabel: "Unhide",
                onConfirm: doUnhide,
              })
            }
            disabled={loading}
            className="flex items-center justify-center gap-2 w-full
              bg-sky-600/10 hover:bg-sky-600/20 active:scale-[0.98]
              border border-sky-500/25 text-sky-400
              py-3 rounded-xl font-bold text-sm transition-all
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Eye size={14} />
            Unhide Listing
          </button>
        ) : (
          <button
            onClick={() =>
              setConfirm({
                title: "Hide listing?",
                message: `Hide "${listing.title}" from the marketplace? It won't be visible to buyers but won't be deleted.`,
                variant: "warning",
                confirmLabel: "Hide",
                onConfirm: doHide,
              })
            }
            disabled={loading}
            className="flex items-center justify-center gap-2 w-full
              bg-slate-500/10 hover:bg-slate-500/20 active:scale-[0.98]
              border border-slate-500/25 text-slate-400
              py-3 rounded-xl font-bold text-sm transition-all
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <EyeOff size={14} />
            Hide Listing
          </button>
        )}

        {/* ── Suspend / Unsuspend ───────────────────────────────────── */}
        {isSuspended ? (
          <button
            onClick={() =>
              setConfirm({
                title: "Reinstate listing?",
                message: `Remove the suspension on "${listing.title}"? The listing will become visible again.`,
                variant: "warning",
                confirmLabel: "Reinstate",
                onConfirm: doUnsuspend,
              })
            }
            disabled={loading}
            className="flex items-center justify-center gap-2 w-full
              bg-emerald-600/10 hover:bg-emerald-600/20 active:scale-[0.98]
              border border-emerald-500/25 text-emerald-400
              py-3 rounded-xl font-bold text-sm transition-all
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ShieldCheck size={14} />
            Reinstate Listing
          </button>
        ) : (
          <button
            onClick={() =>
              setConfirm({
                title: "Suspend listing?",
                message: `Temporarily suspend "${listing.title}"? It will be hidden from buyers and the seller will be notified.`,
                variant: "warning",
                confirmLabel: "Suspend",
                onConfirm: doSuspend,
              })
            }
            disabled={loading}
            className="flex items-center justify-center gap-2 w-full
              bg-amber-500/10 hover:bg-amber-500/20 active:scale-[0.98]
              border border-amber-500/25 text-amber-400
              py-3 rounded-xl font-bold text-sm transition-all
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ShieldOff size={14} />
            Suspend Listing
          </button>
        )}

        {/* ── Delete ───────────────────────────────────────────────── */}
        <button
          onClick={() =>
            setConfirm({
              title: "Delete listing permanently?",
              message: `"${listing.title}" will be permanently deleted and the seller will be notified. This cannot be undone.`,
              variant: "danger",
              confirmLabel: "Delete Listing",
              onConfirm: doDelete,
            })
          }
          disabled={loading}
          className="flex items-center justify-center gap-2 w-full
            bg-red-600/10 hover:bg-red-600/20 active:scale-[0.98]
            border border-red-500/25 text-red-400
            py-3 rounded-xl font-bold text-sm transition-all
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Trash2 size={14} />
          Delete Listing
        </button>
      </div>

      {confirm && (
        <ConfirmModal
          {...confirm}
          onClose={() => setConfirm(null)}
        />
      )}
    </>
  );
}
