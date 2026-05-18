// src/components/Admin/Reports/ReportListingCard.jsx
//
// FIX — Glassmorphism action buttons:
//
//   Dismiss All  → green glass  (50% green fill + backdrop-blur)
//   Penalize     → amber glass  (50% amber fill + backdrop-blur)
//   Delete       → deep red glass (50% crimson fill + backdrop-blur)
//
// Buttons are also made slightly smaller (py-2 instead of py-3)
// with compact text on mobile.
//
// Responsive layout is unchanged: 3-col on desktop, horizontal strip on mobile.

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

function getPrice(listing) {
  if (!listing) return null;
  if (listing.price != null)
    return `GH₵ ${Number(listing.price).toLocaleString()}`;
  if (listing.price_min && listing.price_max)
    return `GH₵ ${Number(listing.price_min).toLocaleString()} – ${Number(listing.price_max).toLocaleString()}`;
  return "Ask for price";
}

// ── Glassmorphism button styles ───────────────────────────────────────────────
//
// "Glass" effect: semi-transparent coloured fill + a very subtle backdrop-filter.
// On browsers that don't support backdrop-filter it gracefully falls back to the
// flat colour (still looks great, just without the blur).
//
// We keep all colours as raw HSL numbers so they read on both light & dark themes.
//
const GLASS_STYLES = {
  dismiss: {
    // 50% opacity emerald
    background: "hsla(142, 71%, 40%, 0.50)",
    border: "1px solid hsla(142, 71%, 55%, 0.55)",
    color: "#ffffff",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    boxShadow: "0 2px 10px hsla(142, 71%, 40%, 0.25)",
  },
  penalize: {
    // 50% opacity amber
    background: "hsla(38, 92%, 48%, 0.50)",
    border: "1px solid hsla(38, 92%, 60%, 0.55)",
    color: "#ffffff",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    boxShadow: "0 2px 10px hsla(38, 92%, 48%, 0.25)",
  },
  delete: {
    // 50% opacity deep crimson
    background: "hsla(0, 72%, 45%, 0.55)",
    border: "1px solid hsla(0, 72%, 60%, 0.55)",
    color: "#ffffff",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    boxShadow: "0 2px 10px hsla(0, 72%, 45%, 0.30)",
  },
};

export default function ReportListingCard({ listing, onAction }) {
  const navigate = useNavigate();

  const reports  = listing.reports ?? [];
  const price    = getPrice(listing);
  const category = listing.category_name ?? null;
  const listingDate = listing.listing_created_at
    ? new Date(listing.listing_created_at).toLocaleDateString("en-GB", {
        day: "2-digit", month: "short", year: "numeric",
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
                alt={listing.title ?? "Listing"}
                className="w-full h-full object-cover"
                onError={(e) => { e.currentTarget.src = "/placeholder.png"; }}
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
              <span className="font-bold text-brand">{listing.seller_name ?? "Unknown"}</span>
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
                  <span className="font-semibold text-main truncate">{price.replace("GH₵ ", "")}</span>
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
              onClick={() => navigate(`/listing/${listing.listing_id}`)}
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
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black"
              style={{
                background: "hsl(var(--danger)/0.1)",
                border: "1px solid hsl(var(--danger)/0.22)",
                color: "hsl(var(--danger))",
              }}
            >
              <Flag size={10} />
              {reports.length} Report{reports.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Each reporter row */}
          <div className="divide-y divide-[hsl(var(--border))]">
            {reports.map((report) => (
              <ReporterItem
                key={report.report_id}
                report={report}
                onFalseReport={(payload) => onAction("false_report", payload)}
              />
            ))}
          </div>
        </div>

        {/* ═══ RIGHT: Glassmorphism action buttons ═══════════════════
         *
         * Mobile  (<lg): horizontal row pinned to the bottom
         * Desktop (lg+): vertical column on the right edge
         *
         * Each button uses the GLASS_STYLES object above.
         */}
        <div className="flex flex-row lg:flex-col gap-2 p-3 lg:w-40 xl:w-44 lg:shrink-0 border-t lg:border-t-0 lg:border-l border-app bg-surface-2/10 items-stretch">

          {/* ── Dismiss All (green) ── */}
          <button
            onClick={() =>
              onAction("dismiss_all", {
                listingId: listing.listing_id,
                listingTitle: listing.title,
              })
            }
            className="flex-1 lg:flex-none flex items-center justify-center gap-1.5
              px-2 py-2 rounded-xl font-bold text-[11px] leading-tight text-center
              active:scale-95 transition-all"
            style={GLASS_STYLES.dismiss}
          >
            <CheckCircle2 size={12} className="shrink-0" />
            <span className="hidden sm:inline lg:hidden xl:inline">Dismiss All</span>
            <span className="sm:hidden lg:inline xl:hidden">Dismiss</span>
          </button>

          {/* ── Penalize Seller (amber) ── */}
          <button
            onClick={() =>
              onAction("penalize_seller", {
                listingId: listing.listing_id,
                listingTitle: listing.title,
                sellerName: listing.seller_name,
              })
            }
            className="flex-1 lg:flex-none flex items-center justify-center gap-1.5
              px-2 py-2 rounded-xl font-bold text-[11px] leading-tight text-center
              active:scale-95 transition-all"
            style={GLASS_STYLES.penalize}
          >
            <ShieldX size={12} className="shrink-0" />
            <span className="hidden sm:inline lg:hidden xl:inline">Penalize (−10)</span>
            <span className="sm:hidden lg:inline xl:hidden">−10 pts</span>
          </button>

          {/* ── Delete Listing (deep red) ── */}
          <button
            onClick={() =>
              onAction("delete_listing", {
                listingId: listing.listing_id,
                listingTitle: listing.title,
                sellerName: listing.seller_name,
              })
            }
            className="flex-1 lg:flex-none flex items-center justify-center gap-1.5
              px-2 py-2 rounded-xl font-bold text-[11px] leading-tight text-center
              active:scale-95 transition-all"
            style={GLASS_STYLES.delete}
          >
            <Trash2 size={12} className="shrink-0" />
            <span className="hidden sm:inline lg:hidden xl:inline">Delete Listing</span>
            <span className="sm:hidden lg:inline xl:hidden">Delete</span>
          </button>
        </div>

      </div>
    </div>
  );
}
