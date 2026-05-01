import SaveButton from "./SaveButton";

/**
 * FeedCard — minimalist marketplace card (AliExpress style).
 * Shows ONLY: image, title, short description, badge + heart on image, price.
 */
export function FeedCard({ item, onClick }) {
  const getPriceDisplay = () => {
    if (item.price !== null && item.price !== undefined)
      return `GH₵ ${item.price}`;
    if (item.price_min && item.price_max)
      return `GH₵ ${item.price_min}–${item.price_max}`;
    if (item.price_min) return `From GH₵ ${item.price_min}`;
    if (item.price_max) return `Up to GH₵ ${item.price_max}`;
    return "Ask for price";
  };

  const isService = item.listing_type === "service";
  const desc = item.description || item.condition || "";

  return (
    <article
      onClick={onClick}
      // UPDATED CLASSES BELOW: changed transition-[shadow,transform] to transition-all, duration-200 to 300, and ease-out to ease-in-out
      className="feed-card group cursor-pointer flex flex-col h-full overflow-hidden
        transition-all duration-300 ease-in-out
        hover:-translate-y-1
        hover:shadow-[0_4px_16px_rgba(0,0,0,0.18)] dark:hover:shadow-[0_4px_20px_rgba(0,0,0,0.55)]"
    >
      {/* Image */}
      <div className="relative w-full aspect-square bg-surface-2 overflow-hidden">
        <img
          src={item.image_url || "/placeholder.png"}
          onError={(e) => {
            if (e.currentTarget.src.endsWith("/placeholder.png")) return;
            e.currentTarget.src = "/placeholder.png";
          }}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover"
          alt={item.title}
        />

        {/* Badge (left) + Heart (right) */}
        <div className="absolute top-2 left-2 right-2 flex justify-between items-start gap-2">
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
              isService
                ? "bg-[hsl(var(--accent)/0.92)] text-white"
                : "bg-[hsl(var(--primary)/0.92)] text-[hsl(var(--primary-fg))]"
            }`}
            style={{ borderRadius: 4 }}
          >
            {isService ? "Service" : "Product"}
          </span>

          <div onClick={(e) => e.stopPropagation()}>
            <SaveButton listingId={item.id} variant="heart" />
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-2.5 flex flex-col gap-1 flex-1">
        <h3
          className="font-medium text-sm text-main leading-snug truncate"
          title={item.title}
        >
          {item.title}
        </h3>

        {desc && (
          <p className="text-xs text-faint leading-snug truncate" title={desc}>
            {desc}
          </p>
        )}

        <div className="mt-auto pt-1">
          <span className="font-bold text-base text-price">
            {getPriceDisplay()}
          </span>
        </div>
      </div>
    </article>
  );
}
