export function FeedCardSkeleton() {
  return (
    <div className="feed-card flex flex-col h-full overflow-hidden animate-pulse">
      {/* Image area */}
      <div className="w-full aspect-square bg-surface-2 relative">
        {/* Badge placeholder */}
        <div className="absolute top-2 left-2 h-4 w-14 rounded bg-[hsl(var(--text)/0.1)]" />
        {/* Heart placeholder */}
        <div className="absolute top-2 right-2 h-6 w-6 rounded-full bg-[hsl(var(--text)/0.1)]" />
      </div>

      {/* Body */}
      <div className="p-2.5 flex flex-col gap-2 flex-1">
        {/* Title */}
        <div className="h-3.5 rounded bg-[hsl(var(--text)/0.1)] w-3/4" />
        {/* Description */}
        <div className="h-3 rounded bg-[hsl(var(--text)/0.07)] w-full" />
        {/* Price */}
        <div className="mt-auto pt-1 h-4 rounded bg-[hsl(var(--text)/0.1)] w-1/3" />
      </div>
    </div>
  );
}
