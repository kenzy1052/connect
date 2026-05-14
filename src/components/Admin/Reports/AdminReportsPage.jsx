import { useState } from "react";
import { CheckCircle2, RefreshCw, AlertCircle } from "lucide-react";
import { supabase } from "../../../lib/supabaseClient";
import { useToast } from "../../../context/ToastContext";
import ConfirmModal from "../../UI/ConfirmModal";
import ReportListingCard from "./ReportListingCard";
import { useAdminReports } from "./useAdminReports";

/* ── Skeleton ─────────────────────────────────────────────────── */
function ReportSkeleton() {
  return (
    <div className="bg-surface border border-app rounded-2xl overflow-hidden animate-pulse">
      <div className="flex flex-col lg:flex-row">
        <div className="p-4 lg:w-56 lg:border-r border-b lg:border-b-0 border-app">
          <div className="w-full h-36 bg-surface-2 rounded-xl mb-3" />
          <div className="space-y-2">
            <div className="h-3 bg-surface-2 rounded w-3/4" />
            <div className="h-2 bg-surface-2 rounded w-1/2" />
            <div className="h-2 bg-surface-2 rounded w-2/3" />
            <div className="h-8 bg-surface-2 rounded-xl mt-4" />
          </div>
        </div>
        <div className="flex-1 p-4 space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex gap-3 items-center">
              <div className="w-8 h-8 rounded-full bg-surface-2 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-2.5 bg-surface-2 rounded w-24" />
                <div className="h-2 bg-surface-2 rounded w-40" />
              </div>
              <div className="w-28 h-7 bg-surface-2 rounded-lg shrink-0" />
            </div>
          ))}
        </div>
        <div className="p-3 lg:w-44 bg-surface-2/20 flex flex-row lg:flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex-1 h-11 bg-surface-2 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Main component ───────────────────────────────────────────── */
export default function AdminReportsPage() {
  const toast = useToast();
  const { reports, loading, error, refetch } = useAdminReports();
  const [confirm, setConfirm] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  /* ── Action helpers ─────────────────────────────────────────── */
  const callRpc = async (fn, args, successMsg) => {
    setActionLoading(true);
    const { error: rpcError } = await supabase.rpc(fn, args);
    setActionLoading(false);
    if (rpcError) {
      toast.error(rpcError.message ?? "Action failed.");
      return false;
    }
    toast.success(successMsg);
    return true;
  };

  const doFalseReport = async ({ reportId, reporterId }) => {
    const ok = await callRpc(
      "admin_penalise_reporter",
      { p_reporter_id: reporterId, p_report_id: reportId, p_penalty: 2 },
      "Reporter penalised −2. Report dismissed."
    );
    if (ok) refetch();
  };

  const doDismissAll = async ({ listingId }) => {
    const ok = await callRpc(
      "admin_dismiss_reports_for_listing",
      { p_listing_id: listingId },
      "All reports dismissed."
    );
    if (ok) refetch();
  };

  const doPenalizeSeller = async ({ listingId }) => {
    const ok = await callRpc(
      "admin_confirm_listing_reports",
      { p_listing_id: listingId },
      "Seller penalised −10."
    );
    if (ok) refetch();
  };

  const doDeleteListing = async ({ listingId }) => {
    const ok = await callRpc(
      "admin_delete_listing",
      { p_listing_id: listingId },
      "Listing deleted."
    );
    if (ok) refetch();
  };

  /* ── Dispatch action → show confirm modal ───────────────────── */
  const handleAction = (type, payload) => {
    const configs = {
      false_report: {
        title: "Mark as false report?",
        message: `Deduct 2 trust points from ${payload.reporterName}.`,
        variant: "warning",
        confirmLabel: "Mark False −2",
        onConfirm: () => doFalseReport(payload),
      },
      dismiss_all: {
        title: "Dismiss all reports?",
        message: `Dismiss all reports for "${payload.listingTitle ?? "this listing"}" with no penalties.`,
        variant: "warning",
        confirmLabel: "Dismiss All",
        onConfirm: () => doDismissAll(payload),
      },
      penalize_seller: {
        title: "Penalize seller?",
        message: `Deduct 10 trust points from ${payload.sellerName} for "${payload.listingTitle ?? "this listing"}".`,
        variant: "danger",
        confirmLabel: "Penalize −10",
        onConfirm: () => doPenalizeSeller(payload),
      },
      delete_listing: {
        title: "Delete listing permanently?",
        message: `"${payload.listingTitle ?? "This listing"}" by ${payload.sellerName} will be deleted. This cannot be undone.`,
        variant: "danger",
        confirmLabel: "Delete Listing",
        onConfirm: () => doDeleteListing(payload),
      },
    };
    setConfirm(configs[type]);
  };

  const totalReports = reports.reduce(
    (sum, r) => sum + (r.pending_reports ?? 0),
    0
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-xl font-black text-main mb-0.5">Reports</h2>
        <p className="text-sm text-muted">
          Manage reported listings. Review, take action and maintain a safe marketplace.
        </p>
      </div>

      {/* Summary bar */}
      <div className="flex items-center justify-between bg-surface border border-app rounded-xl px-4 py-3">
        <div className="flex items-center gap-3 flex-wrap gap-y-1 text-sm">
          <span className="flex items-center gap-2 font-bold text-main">
            <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[10px] font-black">
              {reports.length}
            </span>
            Reported Listing{reports.length !== 1 ? "s" : ""}
          </span>
          <span className="text-faint">|</span>
          <span className="text-muted">
            {totalReports} Pending Report{totalReports !== 1 ? "s" : ""}
          </span>
        </div>
        <button
          onClick={refetch}
          disabled={loading || actionLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-2 hover:bg-surface-3 border border-app text-xs font-bold text-muted hover:text-main transition-all disabled:opacity-50"
        >
          <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Error state */}
      {error && !loading && (
        <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          <AlertCircle size={16} className="text-red-400 shrink-0" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <ReportSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && !error && reports.length === 0 && (
        <div className="text-center py-20 flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <CheckCircle2 size={26} className="text-emerald-400" />
          </div>
          <p className="font-black text-main text-lg">All clear!</p>
          <p className="text-sm text-faint max-w-xs">
            No pending reports. You&apos;re all caught up.
          </p>
        </div>
      )}

      {/* One card per reported listing */}
      {!loading &&
        reports.map((listing) => (
          <ReportListingCard
            key={listing.listing_id}
            listing={listing}
            onAction={handleAction}
          />
        ))}

      {/* Confirm modal — uses onClose (matches ConfirmModal.jsx API) */}
      {confirm && (
        <ConfirmModal
          {...confirm}
          onClose={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
