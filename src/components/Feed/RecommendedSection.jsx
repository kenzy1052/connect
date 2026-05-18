// src/components/Feed/RecommendedSection.jsx
//
// TASK 3 FIX — Card UI parity:
// Recommendation cards now use the EXACT same FeedCard component and
// the EXACT same grid layout as FeedList.jsx. Zero custom wrappers,
// zero size overrides, zero visual divergence from the main feed.
//
// Before: horizontal scroll row with min-w-[160px] wrappers, different
//         sm/md/lg breakpoints from the main feed.
// After:  standard 2→3→4→5 col grid, identical to FeedList.

import { useAuth } from "../../context/AuthContext";
import { useRecommendations } from "../../hooks/useRecommendations";
import { FeedCard } from "./FeedCard";
import { FeedCardSkeleton } from "./FeedCardSkeleton";
import { Sparkles } from "lucide-react";

/**
 * RecommendedSection
 *
 * Shows a "Recommended for you" grid driven by the user's browse history.
 * Cards are rendered with <FeedCard> — the same component used everywhere
 * else in the feed — inside the same grid layout as <FeedList>.
 * This guarantees pixel-perfect parity between the two surfaces.
 */
export default function RecommendedSection({ onListingClick }) {
  const { user } = useAuth();
  const { recommended, loading, reason } = useRecommendations(user?.id);

  // While loading, show skeleton cards so layout doesn't jump
  if (loading) {
    return (
      <section className="mb-8" aria-label="Recommended listings loading">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={15} className="text-brand" />
          <h2 className="text-sm font-black text-main uppercase tracking-widest">
            Recommended for you
          </h2>
        </div>
        {/* Same grid spec as FeedList */}
        <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 items-stretch auto-rows-fr">
          {Array.from({ length: 5 }).map((_, i) => (
            <FeedCardSkeleton key={`rec-skeleton-${i}`} />
          ))}
        </div>
      </section>
    );
  }

  if (recommended.length === 0) return null;

  return (
    <section className="mb-8" aria-label="Recommended listings">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-3">
        <Sparkles size={15} className="text-brand" />
        <h2 className="text-sm font-black text-main uppercase tracking-widest">
          Recommended for you
        </h2>
        {reason && (
          <span className="text-[10px] text-faint">· based on {reason}</span>
        )}
      </div>

      {/*
       * Grid layout — identical to FeedList.jsx:
       *   grid-cols-2 (mobile) → sm:3 → md:4 → lg:5
       * No horizontal scroll, no custom min-widths, no wrapper divs.
       * FeedCard is self-contained and works correctly at all widths.
       */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 items-stretch auto-rows-fr">
        {recommended.map((item) => (
          <FeedCard
            key={item.id}
            item={item}
            onClick={() => onListingClick(item)}
          />
        ))}
      </div>
    </section>
  );
}
