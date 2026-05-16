import { useAuth } from "../../context/AuthContext";
import { useRecommendations } from "../../hooks/useRecommendations";
import { Sparkles } from "lucide-react";
import SaveButton from "./SaveButton";

/**
 * RecommendedSection — compact horizontal strip of personalised listing cards.
 *
 * Uses a small fixed-size card (not the full FeedCard) so it doesn't dwarf
 * the main feed. Cards are square images with title + price underneath,
 * matching the visual language of the rest of the marketplace.
 */

function getPriceDisplay(item) {
  if (item.price !== null && item.price !== undefined)
    return `GH₵ ${Number(item.price).toLocaleString()}`;
  if (item.price_min && item.price_max)
    return `GH₵ ${Number(item.price_min).toLocaleString()}–${Number(item.price_max).toLocaleString()}`;
  if (item.price_min) return `From GH₵ ${Number(item.price_min).toLocaleString()}`;
  return "Ask for price";
}

function RecommendedCard({ item, onClick }) {
  const isService = item.listing_type === "service";

  return (
    <article
      onClick={onClick}
      className="group cursor-pointer flex flex-col w-36 shrink-0 sm:w-auto overflow-hidden rounded-xl border border-app bg-surface hover:border-indigo-500/30 hover:shadow-md transition-all duration-200"
    >
      {/* Square image */}
      <div className="relative w-full aspect-square bg-surface-2 overflow-hidden rounded-t-xl">
        <img
          src={item.image_url || "/placeholder.png"}
          onError={(e) => {
            if (!e.currentTarget.src.endsWith("/placeholder.png"))
              e.currentTarget.src = "/placeholder.png";
          }}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          alt={item.title}
        />

        {/* Type badge */}
        <span
          className={`absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
            isService
              ? "bg-[hsl(var(--accent)/0.90)] text-white"
              : "bg-[hsl(var(--primary)/0.90)] text-[hsl(var(--primary-fg))]"
          }`}
        >
          {isService ? "Service" : "Product"}
        </span>

        {/* Save button */}
        <div
          className="absolute top-1 right-1"
          onClick={(e) => e.stopPropagation()}
        >
          <SaveButton listingId={item.id} variant="heart" />
        </div>
      </div>

      {/* Info */}
      <div className="p-2 flex flex-col gap-0.5">
        <p
          className="text-[12px] font-semibold text-main leading-snug line-clamp-2"
          title={item.title}
        >
          {item.title}
        </p>
        <p className="text-[12px] font-black text-[hsl(var(--primary))] mt-0.5">
          {getPriceDisplay(item)}
        </p>
      </div>
    </article>
  );
}

export default function RecommendedSection({ onListingClick }) {
  const { user } = useAuth();
  const { recommended, loading, reason } = useRecommendations(user?.id);

  if (loading || recommended.length === 0) return null;

  return (
    <div className="mb-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 px-0.5">
        <Sparkles size={13} className="text-[hsl(var(--primary))] shrink-0" />
        <h2 className="text-[11px] font-black text-main uppercase tracking-widest">
          Recommended for you
        </h2>
        {reason && (
          <span className="text-[10px] text-faint truncate">· based on {reason}</span>
        )}
      </div>

      {/* Horizontal scroll on mobile, compact grid on larger screens */}
      <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide sm:grid sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 sm:overflow-visible">
        {recommended.slice(0, 6).map((item) => (
          <RecommendedCard
            key={item.id}
            item={item}
            onClick={() => onListingClick(item)}
          />
        ))}
      </div>
    </div>
  );
}
