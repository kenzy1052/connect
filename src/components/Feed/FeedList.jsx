// src/components/Feed/FeedList.jsx
//
// FIX — Gap between every 8 listings caused by ad banner dividers
//
// Root cause: `auto-rows-fr` forced ALL implicit grid rows to equal height
// (a fraction of the container). When a `col-span-full` AdBanner div was
// injected, it occupied its own row at the same `fr` height as the card rows,
// making a large blank area appear above/below the ad.
//
// Fix: replaced `auto-rows-fr` with `auto-rows-auto` so each row naturally
// sizes to its own content. Cards that wrap to a new row no longer have
// unexpected empty space. Used `items-start` instead of `items-stretch` so
// cards don't stretch to fill artificially tall rows.

import { FeedCard } from "./FeedCard";
import { FeedCardSkeleton } from "./FeedCardSkeleton";
import { EmptyState } from "./EmptyState";
import AdBanner from "./AdBanner";
import { Search, Bookmark, Package } from "lucide-react";

// Inject an ad banner every N listing cards (full-width, inside the grid)
const AD_EVERY_N = 8;

export function FeedList({ listings, onListingClick, loading, type = "feed" }) {
  if (loading) {
    return (
      <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-5 items-start">
        {Array.from({ length: 10 }).map((_, i) => (
          <FeedCardSkeleton key={`skeleton-${i}`} />
        ))}
      </div>
    );
  }

  if (!listings || listings.length === 0) {
    if (type === "favorites") {
      return (
        <EmptyState
          icon={<Bookmark size={48} strokeWidth={1.5} />}
          title="No saved listings yet"
          description="Tap the heart on any listing to save it here."
          buttonText="Browse Feed"
          buttonTo="/"
        />
      );
    }
    if (type === "profile") {
      return (
        <EmptyState
          icon={<Package size={48} strokeWidth={1.5} />}
          title="No active listings"
          description="Your shop is looking a bit empty. Turn your clutter into cash!"
          buttonText="Post a listing"
          buttonTo="/create"
        />
      );
    }
    return (
      <EmptyState
        icon={<Search size={48} strokeWidth={1.5} />}
        title="No listings found"
        description="Try adjusting your filters or search terms to find what you're looking for."
        buttonText="Back to Feed"
        buttonTo="/"
      />
    );
  }

  // Build the render list interleaving full-width ad slots
  const renderItems = [];
  listings.forEach((item, index) => {
    renderItems.push(
      <FeedCard
        key={item.id}
        item={item}
        onClick={() => onListingClick(item)}
      />,
    );

    // After every AD_EVERY_N items, inject a full-width ad
    if ((index + 1) % AD_EVERY_N === 0) {
      const adSlotNum = Math.floor((index + 1) / AD_EVERY_N);
      // IMPORTANT: className="col-span-full" is passed INTO AdBanner so the
      // full-width grid row only exists when AdBanner actually has an ad to
      // show. If we wrapped with a <div className="col-span-full"> here, the
      // div would always occupy a grid row — causing phantom gaps when there
      // are no ads.
      renderItems.push(
        <AdBanner
          key={`ad-slot-${adSlotNum}`}
          slot={`feed-mid-${adSlotNum}`}
          compact
          className="col-span-full"
        />,
      );
    }
  });

  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-5 items-start auto-rows-auto">
      {renderItems}
    </div>
  );
}
