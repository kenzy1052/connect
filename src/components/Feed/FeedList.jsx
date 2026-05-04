import { FeedCard } from "./FeedCard";
import { FeedCardSkeleton } from "./FeedCardSkeleton";
import { EmptyState } from "./EmptyState";
import { Search, Bookmark, Package } from "lucide-react";

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
          buttonTo="/sell"
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

  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 items-stretch auto-rows-fr">
      {listings.map((item) => (
        <FeedCard
          key={item.id}
          item={item}
          onClick={() => onListingClick(item)}
        />
      ))}
    </div>
  );
}
