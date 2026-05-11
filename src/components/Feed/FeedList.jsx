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
      <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 items-stretch auto-rows-fr">
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
      renderItems.push(
        <div key={`ad-slot-${adSlotNum}`} className="col-span-full">
          <AdBanner slot={`feed-mid-${adSlotNum}`} compact />
        </div>,
      );
    }
  });

  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 items-stretch auto-rows-fr">
      {renderItems}
    </div>
  );
}
