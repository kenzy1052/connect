export function CardSkeleton() {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden animate-pulse">
      <div className="aspect-square bg-slate-800" />
      <div className="p-3 space-y-2">
        <div className="h-3 w-3/4 bg-slate-800 rounded" />
        <div className="h-3 w-1/2 bg-slate-800 rounded" />
      </div>
    </div>
  );
}

export function GridSkeleton({ count = 10 }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function RowSkeleton({ count = 5 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-slate-900 border border-slate-800 rounded-2xl h-20 animate-pulse"
        />
      ))}
    </div>
  );
}
