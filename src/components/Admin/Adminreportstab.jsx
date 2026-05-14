import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Eye,
  ShieldX,
  Trash2,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  Tag,
  Calendar,
  Flag,
  Package,
} from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { useToast } from "../../context/ToastContext";
import ConfirmModal from "../UI/ConfirmModal";

/* ── Helpers ──────────────────────────────────────────────────────── */
function timeAgo(ts) {
  if (!ts) return "—";
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs !== 1 ? "s" : ""} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days !== 1 ? "s" : ""} ago`;
}

function getPrice(listing) {
  if (!listing) return null;
  if (listing.price != null)
    return `GH₵ ${Number(listing.price).toLocaleString()}`;
  if (listing.price_min && listing.price_max)
    return `GH₵ ${Number(listing.price_min).toLocaleString()} – ${Number(
      listing.price_max,
    ).toLocaleString()}`;
  return "Ask for price";
}

function getCoverImage(listing) {
  if (!listing?.listing_images?.length) return null;
  const sorted = [...listing.listing_images].sort(
    (a, b) => (a.position ?? 99) - (b.position ?? 99),
  );
  return (
    listing.listing_images.find((i) => i.is_cover)?.image_url ||
    sorted[0]?.image_url ||
    null
  );
}

const REASON_LABELS = {
  spam: "Spam or misleading",
  fake: "Fake or counterfeit",
  prohibited: "Prohibited item",
  wrong_price: "Fraudulent pricing",
  already_sold: "Already sold",
  other: "Other",
};

/* ── Single report card — ONE per reported listing ────────────────── */
function ReportCard({ group, onAction }) {
  const navigate = useNavigate();
  const { listingId, listing, reports } = group;

  const sellerName =
    listing?.seller?.business_name ||
    listing?.seller?.full_name ||
    "Unknown Seller";
  const coverImage = getCoverImage(listing);
  const price = getPrice(listing);
  const category = listing?.category?.name;
  const listingDate = listing?.created_at
    ? new Date(listing.created_at).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <div className="bg-surface border border-app rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="flex flex-col lg:flex-row">
        {/* ═══ LEFT: Listing details ════════════════════════════════ */}
        <div className="flex flex-row lg:flex-col gap-3 p-4 lg:w-56 xl:w-60 lg:shrink-0 lg:border-r border-b lg:border-b-0 border-app">
          {/* Cover image */}
          <div className="w-20 h-20 sm:w-24 sm:h-24 lg:w-full lg:h-36 xl:h-40 rounded-xl overflow-hidden bg-surface-2 border border-app shrink-0">
            {coverImage ? (
              <img
                src={coverImage}
                alt={listing?.title ?? "Listing"}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = "/placeholder.png";
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-faint">
                <Package size={28} />
              </div>
            )}
          </div>

          {/* Text details */}
          <div className="flex-1 min-w-0 flex flex-col gap-1">
            <p className="text-[13px] font-black text-main leading-snug line-clamp-2">
              {listing?.title ?? "Deleted listing"}
            </p>
            <p className="text-[11px] text-muted leading-tight">
              Posted by{" "}
              <span className="font-bold text-[hsl(var(--primary))]">
                {sellerName}
              </span>
            </p>

            <div className="flex flex-col gap-1 mt-1">
              {category && (
                <div className="flex items-center gap-1.5 text-[11px] text-faint">
                  <Tag size={9} className="shrink-0" />
                  <span className="truncate">{category}</span>
                </div>
              )}
              {price && (
                <div className="flex items-center gap-1.5 text-[11px] text-faint">
                  <span className="text-[9px] font-black shrink-0">₵</span>
                  <span className="font-semibold text-main truncate">
                    {price.replace("GH₵ ", "")}
                  </span>
                </div>
              )}
              {listingDate && (
                <div className="flex items-center gap-1.5 text-[11px] text-faint">
                  <Calendar size={9} className="shrink-0" />
                  <span>Listed on: {listingDate}</span>
                </div>
              )}
            </div>

            {listingId && (
              <button
                onClick={() =>
                  navigate(`/listing/${listingId}`, { state: { listing } })
                }
                className="mt-auto flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-xl
                  border border-[hsl(var(--primary)/0.4)] text-[hsl(var(--primary))]
                  hover:bg-[hsl(var(--primary)/0.08)] text-[11px] font-bold transition-colors"
              >
                <Eye size={11} />
                View Listing
              </button>
            )}
          </div>
        </div>

        {/* ═══ MIDDLE: Reporter rows ════════════════════════════════ */}
        <div className="flex-1 min-w-0">
          {/* Report count badge */}
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-app">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/15 border border-red-500/25 text-red-400 text-[11px] font-black">
              <Flag size={10} />
              {reports.length} Report{reports.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Each reporter */}
          <div className="divide-y divide-app">
            {reports.map((report) => {
              const rName =
                report.reporter?.business_name ||
                report.reporter?.full_name ||
                "Anonymous";

              return (
                <div
                  key={report.id}
                  className="flex items-center gap-2 sm:gap-3 px-4 py-3 hover:bg-surface-2/40 transition-colors"
                >
                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full bg-indigo-600/20 border border-indigo-500/20 flex items-center justify-center text-indigo-300 font-black text-[12px] shrink-0">
                    {rName.charAt(0).toUpperCase()}
                  </div>

                  {/* Name + reason */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-bold text-main leading-tight">
                      {rName}
                    </p>
                    <p className="text-[11px] text-muted leading-tight">
                      {REASON_LABELS[report.reason] ?? report.reason}
                      {report.details && (
                        <span className="text-faint hidden sm:inline">
                          {" "}
                          · {report.details}
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Time */}
                  <p className="text-[10px] text-faint shrink-0 hidden md:block whitespace-nowrap">
                    {timeAgo(report.created_at)}
                  </p>

                  {/* False report button */}
                  <button
                    onClick={() =>
                      onAction("false_report", {
                        reportId: report.id,
                        reporterId: report.reporter_id,
                        reporterName: rName,
                      })
                    }
                    className="shrink-0 flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg
                      border border-red-500/40 bg-red-500/5 text-red-400 hover:bg-red-500/15
                      text-[10px] font-black transition-colors whitespace-nowrap"
                  >
                    <AlertTriangle size={9} />
                    False Report (−2)
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* ═══ RIGHT: Action buttons ════════════════════════════════ */}
        <div
          className="flex flex-row lg:flex-col gap-2 p-3 lg:w-44 xl:w-48 lg:shrink-0
          border-t lg:border-t-0 lg:border-l border-app bg-surface-2/20
          items-stretch"
        >
          <button
            onClick={() =>
              onAction("dismiss_all", {
                listingId,
                listingTitle: listing?.title,
              })
            }
            className="flex-1 lg:flex-none flex items-center justify-center gap-1.5
              px-3 py-3 rounded-xl font-bold text-[12px]
              bg-amber-500 hover:bg-amber-400 active:scale-95 text-white
              transition-all shadow-sm shadow-amber-500/25"
          >
            <CheckCircle2 size={13} />
            Dismiss All
          </button>

          <button
            onClick={() =>
              onAction("penalize_seller", {
                listingId,
                listingTitle: listing?.title,
                sellerName,
              })
            }
            className="flex-1 lg:flex-none flex items-center justify-center gap-1.5
              px-3 py-3 rounded-xl font-bold text-[12px]
              bg-orange-500 hover:bg-orange-400 active:scale-95 text-white
              transition-all shadow-sm shadow-orange-500/25 text-center leading-tight"
          >
            <ShieldX size={13} />
            Penalize Seller (−10)
          </button>

          <button
            onClick={() =>
              onAction("delete_listing", {
                listingId,
                listingTitle: listing?.title,
                sellerName,
              })
            }
            className="flex-1 lg:flex-none flex items-center justify-center gap-1.5
              px-3 py-3 rounded-xl font-bold text-[12px]
              bg-red-600 hover:bg-red-500 active:scale-95 text-white
              transition-all shadow-sm shadow-red-600/25"
          >
            <Trash2 size={13} />
            Delete Listing
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Skeleton loader ──────────────────────────────────────────────── */
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

/* ── Main AdminReportsTab component ───────────────────────────────── */
export default function AdminReportsTab() {
  const toast = useToast();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchReports = useCallback(async () => {
    setLoading(true);

    /*
     * TWO-STEP FETCH — avoids relying on PostgREST embedded joins for
     * listings (which require a defined FK constraint in the database).
     *
     * Step 1: fetch all unresolved reports + reporter profiles
     * Step 2: fetch the listing rows we need in a separate query
     * Step 3: merge and group by listing_id
     *
     * The reporter join (profiles!reporter_id) works because that FK
     * exists.  The listing join was silently returning null because the
     * reports.listing_id → listings.id FK constraint was never created,
     * making all listings appear as "Deleted listing / Unknown seller".
     */

    // ── Step 1: reports + reporters ──────────────────────────────
    const { data: reportsData, error: reportsError } = await supabase
      .from("reports")
      .select(
        `
        id,
        reason,
        details,
        created_at,
        reporter_id,
        listing_id,
        reporter:profiles!reporter_id(
          id,
          full_name,
          business_name,
          trust_score
        )
      `,
      )
      .eq("is_resolved", false)
      .order("created_at", { ascending: false });

    if (reportsError) {
      toast.error(
        "Failed to load reports" +
          (reportsError.message ? `: ${reportsError.message}` : "."),
      );
      setLoading(false);
      return;
    }

    const reports = reportsData ?? [];

    // ── Step 2: fetch listing details for all unique listing IDs ─
    const listingIds = [
      ...new Set(reports.map((r) => r.listing_id).filter(Boolean)),
    ];

    let listingMap = {};

    if (listingIds.length > 0) {
      const { data: listingsData, error: listingsError } = await supabase
        .from("listings")
        .select(
          `
          id,
          title,
          price,
          price_min,
          price_max,
          type,
          created_at,
          seller_id,
          seller:profiles!seller_id(
            full_name,
            business_name
          ),
          listing_images(
            image_url,
            is_cover,
            position
          ),
          category:categories(name)
        `,
        )
        .in("id", listingIds);

      if (listingsError) {
        toast.error(
          "Failed to load listing details" +
            (listingsError.message ? `: ${listingsError.message}` : "."),
        );
      } else {
        for (const listing of listingsData ?? []) {
          listingMap[listing.id] = listing;
        }
      }
    }

    // ── Step 3: group reports by listing_id ──────────────────────
    const map = new Map();
    for (const report of reports) {
      const key = report.listing_id ?? `orphan-${report.id}`;

      if (!map.has(key)) {
        map.set(key, {
          listingId: report.listing_id,
          listing: report.listing_id
            ? (listingMap[report.listing_id] ?? null)
            : null,
          reports: [],
        });
      }

      map.get(key).reports.push(report);
    }

    setGroups([...map.values()]);
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  /* ── Action dispatch ──────────────────────────────────────────── */
  const handleAction = (type, payload) => {
    const configs = {
      false_report: {
        title: "Mark as false report?",
        message: `Deduct 2 trust points from ${payload.reporterName} and mark their report as false.`,
        variant: "warning",
        confirmLabel: "Mark False −2",
        onConfirm: () => doFalseReport(payload),
      },
      dismiss_all: {
        title: "Dismiss all reports?",
        message: `Dismiss all reports for "${
          payload.listingTitle ?? "this listing"
        }" with no penalties.`,
        variant: "warning",
        confirmLabel: "Dismiss All",
        onConfirm: () => doDismissAll(payload),
      },
      penalize_seller: {
        title: "Penalize seller?",
        message: `Deduct 10 trust points from ${
          payload.sellerName
        } and confirm all reports for "${
          payload.listingTitle ?? "this listing"
        }".`,
        variant: "danger",
        confirmLabel: "Penalize −10",
        onConfirm: () => doPenalizeSeller(payload),
      },
      delete_listing: {
        title: "Delete listing permanently?",
        message: `"${payload.listingTitle ?? "This listing"}" by ${
          payload.sellerName
        } will be permanently deleted. This cannot be undone.`,
        variant: "danger",
        confirmLabel: "Delete Listing",
        onConfirm: () => doDeleteListing(payload),
      },
    };
    setConfirm(configs[type]);
  };

  const callRpc = async (fn, args, successMsg) => {
    setActionLoading(true);
    const { error } = await supabase.rpc(fn, args);
    setActionLoading(false);
    if (error) {
      toast.error(error.message ?? "Action failed.");
      return false;
    }
    toast.success(successMsg);
    return true;
  };

  const doFalseReport = async ({ reportId, reporterId }) => {
    const ok = await callRpc(
      "admin_penalise_reporter",
      { p_reporter_id: reporterId, p_report_id: reportId, p_penalty: 2 },
      "Reporter penalised −2. Report dismissed.",
    );
    if (ok) fetchReports();
  };

  const doDismissAll = async ({ listingId }) => {
    const ok = await callRpc(
      "admin_dismiss_reports_for_listing",
      { p_listing_id: listingId },
      "All reports dismissed.",
    );
    if (ok) fetchReports();
  };

  const doPenalizeSeller = async ({ listingId }) => {
    const ok = await callRpc(
      "admin_confirm_listing_reports",
      { p_listing_id: listingId },
      "Seller penalised −10. Reports confirmed.",
    );
    if (ok) fetchReports();
  };

  const doDeleteListing = async ({ listingId }) => {
    const ok = await callRpc(
      "admin_delete_listing",
      { p_listing_id: listingId },
      "Listing deleted.",
    );
    if (ok) fetchReports();
  };

  const totalReports = groups.reduce((sum, g) => sum + g.reports.length, 0);

  return (
    <div className="space-y-4">
      {/* ── Page header ──────────────────────────────────────────── */}
      <div>
        <h2 className="text-xl font-black text-main mb-0.5">Reports</h2>
        <p className="text-sm text-muted">
          Manage reported listings. Review reports, take action and maintain a
          safe marketplace.
        </p>
      </div>

      {/* ── Summary bar ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between bg-surface border border-app rounded-xl px-4 py-3">
        <div className="flex items-center gap-3 flex-wrap gap-y-1 text-sm">
          <span className="flex items-center gap-2 font-bold text-main">
            <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[10px] font-black">
              {groups.length}
            </span>
            Reported Listing{groups.length !== 1 ? "s" : ""}
          </span>
          <span className="text-faint">|</span>
          <span className="text-muted">
            {totalReports} Total Report{totalReports !== 1 ? "s" : ""}
          </span>
        </div>
        <button
          onClick={fetchReports}
          disabled={loading || actionLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-2 hover:bg-surface-3 border border-app text-xs font-bold text-muted hover:text-main transition-all disabled:opacity-50"
        >
          <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* ── Loading skeletons ─────────────────────────────────────── */}
      {loading && (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <ReportSkeleton key={i} />
          ))}
        </div>
      )}

      {/* ── Empty state ───────────────────────────────────────────── */}
      {!loading && groups.length === 0 && (
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

      {/* ── Report cards — one per reported listing ───────────────── */}
      {!loading &&
        groups.map((group) => (
          <ReportCard
            key={group.listingId ?? group.reports[0]?.id}
            group={group}
            onAction={handleAction}
          />
        ))}

      {/* ── Confirm modal ─────────────────────────────────────────── */}
      {confirm && (
        <ConfirmModal {...confirm} onClose={() => setConfirm(null)} />
      )}
    </div>
  );
}
