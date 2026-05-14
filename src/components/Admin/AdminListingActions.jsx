import { useState } from "react";
import { Trash2, ShieldOff, ShieldCheck, AlertTriangle } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { useToast } from "../../context/ToastContext";
import ConfirmModal from "../UI/ConfirmModal";

/**
 * AdminListingActions — shown ONLY for admins inside ListingDetail.
 *
 * Usage in ListingDetail.jsx (see INSTRUCTIONS.md for exact placement):
 *
 *   import AdminListingActions from "../Admin/AdminListingActions";
 *
 *   // Inside the component, change:
 *   const { user } = useAuth();
 *   // to:
 *   const { user, profile } = useAuth();
 *
 *   // Then after the Report block ({!isOwnListing && ...}), add:
 *   {profile?.role === "admin" && (
 *     <AdminListingActions
 *       listing={listingData}
 *       onDeleted={() => onBack?.()}
 *       onSuspendToggled={(suspended) =>
 *         setListingData((prev) => ({ ...prev, is_suspended: suspended }))
 *       }
 *     />
 *   )}
 */
export default function AdminListingActions({ listing, onDeleted, onSuspendToggled }) {
  const toast = useToast();
  const [confirm, setConfirm] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!listing?.id) return null;

  const isSuspended = listing.is_suspended ?? false;

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

  const doDelete = async () => {
    const ok = await callRpc(
      "admin_delete_listing",
      { p_listing_id: listing.id },
      "Listing deleted. Seller has been notified."
    );
    if (ok) onDeleted?.();
  };

  const doSuspend = async () => {
    const ok = await callRpc(
      "admin_suspend_listing",
      { p_listing_id: listing.id },
      "Listing suspended. Seller has been notified."
    );
    if (ok) onSuspendToggled?.(true);
  };

  const doUnsuspend = async () => {
    const ok = await callRpc(
      "admin_unsuspend_listing",
      { p_listing_id: listing.id },
      "Listing reinstated."
    );
    if (ok) onSuspendToggled?.(false);
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

        {/* Suspend / Unsuspend */}
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

        {/* Delete */}
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
