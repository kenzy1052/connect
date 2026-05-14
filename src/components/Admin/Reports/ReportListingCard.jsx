import { useNavigate } from "react-router-dom";
import {
  Eye,
  ShieldX,
  Trash2,
  CheckCircle2,
  Tag,
  Calendar,
  Flag,
  Package,
} from "lucide-react";
import ReporterItem from "./ReporterItem";

function getPrice(row) {
  if (row.price != null)
    return `GH₵ ${Number(row.price).toLocaleString()}`;
  if (row.price_min && row.price_max)
    return `GH₵ ${Number(row.price_min).toLocaleString()} – ${Number(row.price_max).toLocaleString()}`;
  return null;
}

export default function ReportListingCard({ listing, onAction }) {
  const navigate = useNavigate();

  const reports = listing.reports ?? [];
  const price = getPrice(listing);
  const listingDate = listing.listing_created_at
    ? new Date(listing.listing_created_at).toLocaleDateString("en-GB", {
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
            {listing.cover_image_url ? (
              <img
                src={listing.cover_image_url}
                alt={listing.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
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
              {listing.title ?? "Deleted listing"}
            </p>
            <p className="text-[11px] text-muted leading-tight">
              Posted by{" "}
              <span className="font-bold text-[hsl(var(--primary))]">
                {listing.seller_name}
              </span>
            </p>

            <div className="flex flex-col gap-1 mt-1">
              {listing.category_name && (
                <div className="flex items-center gap-1.5 text-[11px] text-faint">
                  <Tag size={9} className="shrink-0" />
                  <span className="truncate">{listing.category_name}</span>
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
                  <span>Listed: {listingDate}</span>
                </div>
              )}
            </div>

            <button
              onClick={() =>
                navigate(`/listing/${listing.listing_id}`)
              }
              className="mt-auto flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-xl
                border border-[hsl(var(--primary)/0.4)] text-[hsl(var(--primary))]
                hover:bg-[hsl(var(--primary)/0.08)] text-[11px] font-bold transition-colors"
            >
              <Eye size={11} />
              View Listing
            </button>
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

          {/* Each reporter row */}
          <div className="divide-y divide-app">
            {reports.map((report) => (
              <ReporterItem
                key={report.report_id}
                report={report}
                onFalseReport={(payload) =>
                  onAction("false_report", payload)
                }
              />
            ))}
          </div>
        </div>

        {/* ═══ RIGHT: Action buttons ════════════════════════════════ */}
        <div
          className="flex flex-row lg:flex-col gap-2 p-3 lg:w-44 xl:w-48 lg:shrink-0
          border-t lg:border-t-0 lg:border-l border-app bg-surface-2/20 items-stretch"
        >
          <button
            onClick={() =>
              onAction("dismiss_all", {
                listingId: listing.listing_id,
                listingTitle: listing.title,
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
                listingId: listing.listing_id,
                listingTitle: listing.title,
                sellerName: listing.seller_name,
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
                listingId: listing.listing_id,
                listingTitle: listing.title,
                sellerName: listing.seller_name,
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
