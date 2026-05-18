// src/components/Admin/Reports/ReportListingCard.jsx
//
// TASK 4 FIX — Action buttons + responsive layout:
//
// Before (bad):
//   bg-amber-500 hover:bg-amber-400   ← Dismiss All
//   bg-orange-500 hover:bg-orange-400 ← Penalize Seller
//   bg-red-600 hover:bg-red-500       ← Delete Listing
//   All with hardcoded glow shadows (shadow-amber-500/25, etc.)
//
// After (correct):
//   All three buttons use CSS theme variables.
//   Dismiss  → "warning" semantic (--warning or --primary tint)
//   Penalize → medium danger (--danger at reduced opacity)
//   Delete   → full danger (--danger solid, no external color)
//
// Responsive layout:
//   Mobile  (<lg): stacked column — listing card, then reporters, then actions row
//   Desktop (lg+): 3-col horizontal — listing | reporters | actions
//   Action buttons are flex-row on mobile (horizontal strip), flex-col on desktop.
//   Fixed ugly mobile action strip overflow by capping text and using gap-2.

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

export default function ReportListingCard({ listing, onAction }) {
  const navigate = useNavigate();

  const reports = listing.reports ?? [];
  const price = getPrice(listing);
  const category = listing.category_name ?? null;
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
                alt={listing.title ?? "Listing"}
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
              {listing.title ?? "Deleted listing"}
            </p>
            <p className="text-[11px] text-muted leading-tight">
              Posted by{" "}
              <span className="font-bold text-brand">
                {listing.seller_name ?? "Unknown"}
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

        {/* ═══ RIGHT: Action buttons ════════════════════════════════
         *
         * Mobile  (<lg): horizontal row pinned to bottom of card
         * Desktop (lg+): vertical column on the right edge
         *
         * ALL colors use CSS theme variables — zero hardcoded amber/orange/red.
         *
         * Dismiss All  → warning tint (--warning HSL var with fallback)
         * Penalize     → danger tint  (--danger at 0.12 opacity bg)
         * Delete       → danger solid (--danger full bg, white text)
         */}
        <div className="flex flex-row lg:flex-col gap-2 p-3 lg:w-44 xl:w-48 lg:shrink-0 border-t lg:border-t-0 lg:border-l border-app bg-surface-2/20 items-stretch">
          {/* Dismiss All */}
          <button
            onClick={() =>
              onAction("dismiss_all", {
                listingId: listing.listing_id,
                listingTitle: listing.title,
              })
            }
            className="flex-1 lg:flex-none flex items-center justify-center gap-1.5
              px-3 py-3 rounded-xl font-bold text-[12px] leading-tight text-center
              active:scale-95 transition-all"
            style={{
              background: "hsl(var(--warning, 42 100% 56%) / 0.12)",
              border: "1px solid hsl(var(--warning, 42 100% 56%) / 0.3)",
              color: "hsl(var(--warning, 42 100% 56%))",
            }}
          >
            <CheckCircle2 size={13} className="shrink-0" />
            <span className="hidden sm:inline lg:hidden xl:inline">
              Dismiss All
            </span>
            <span className="sm:hidden lg:inline xl:hidden">Dismiss</span>
          </button>

          {/* Penalize Seller */}
          <button
            onClick={() =>
              onAction("penalize_seller", {
                listingId: listing.listing_id,
                listingTitle: listing.title,
                sellerName: listing.seller_name,
              })
            }
            className="flex-1 lg:flex-none flex items-center justify-center gap-1.5
              px-3 py-3 rounded-xl font-bold text-[12px] leading-tight text-center
              active:scale-95 transition-all"
            style={{
              background: "hsl(var(--danger)/0.1)",
              border: "1px solid hsl(var(--danger)/0.3)",
              color: "hsl(var(--danger))",
            }}
          >
            <ShieldX size={13} className="shrink-0" />
            <span className="hidden sm:inline lg:hidden xl:inline">
              Penalize (−10)
            </span>
            <span className="sm:hidden lg:inline xl:hidden">−10 pts</span>
          </button>

          {/* Delete Listing — most destructive, full danger color */}
          <button
            onClick={() =>
              onAction("delete_listing", {
                listingId: listing.listing_id,
                listingTitle: listing.title,
                sellerName: listing.seller_name,
              })
            }
            className="flex-1 lg:flex-none flex items-center justify-center gap-1.5
              px-3 py-3 rounded-xl font-bold text-[12px] leading-tight text-center
              active:scale-95 transition-all"
            style={{
              background: "hsl(var(--danger))",
              color: "hsl(var(--primary-fg))",
              boxShadow: "0 2px 8px hsl(var(--danger)/0.25)",
            }}
          >
            <Trash2 size={13} className="shrink-0" />
            <span className="hidden sm:inline lg:hidden xl:inline">
              Delete Listing
            </span>
            <span className="sm:hidden lg:inline xl:hidden">Delete</span>
          </button>
        </div>
      </div>
    </div>
  );
}
