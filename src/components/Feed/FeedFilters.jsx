import { useState, useEffect, useMemo } from "react";
import { X, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const SORT_OPTIONS = [
  { value: "best", label: "Best match" },
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
];

const TYPE_OPTIONS = [
  { value: "all", label: "All" },
  { value: "product", label: "Products" },
  { value: "service", label: "Services" },
];

export function FeedFilters({
  open,
  onClose,
  filter,
  setFilter,
  categoryId,
  setCategoryId,
  searchTerm: _searchTerm,
  setSearchTerm: _setSearchTerm,
  minPrice,
  setMinPrice,
  maxPrice,
  setMaxPrice,
  sortBy,
  setSortBy,
  categories,
}) {
  const [tempFilter, setTempFilter] = useState(filter);
  const [tempCategory, setTempCategory] = useState(categoryId);
  const [tempMin, setTempMin] = useState(minPrice ?? "");
  const [tempMax, setTempMax] = useState(maxPrice ?? "");
  const [tempSort, setTempSort] = useState(sortBy);

  useEffect(() => {
    setTempFilter(filter);
    setTempCategory(categoryId);
    setTempMin(minPrice ?? "");
    setTempMax(maxPrice ?? "");
    setTempSort(sortBy);
  }, [filter, categoryId, minPrice, maxPrice, sortBy]);

  // When type changes, clear category only if it no longer matches
  const handleTypeChange = (t) => {
    setTempFilter(t);
    if (t !== "all") {
      const sel = categories.find((c) => c.id === tempCategory);
      if (sel && sel.type !== t) setTempCategory("");
    }
  };

  const apply = () => {
    setFilter(tempFilter);
    setCategoryId(tempCategory);
    setMinPrice(tempMin === "" ? null : Number(tempMin));
    setMaxPrice(tempMax === "" ? null : Number(tempMax));
    setSortBy(tempSort);
    onClose?.();
  };

  const reset = () => {
    setTempFilter("all");
    setTempCategory("");
    setTempMin("");
    setTempMax("");
    setTempSort("best");
  };

  // Visible categories filtered by selected type
  const visibleCategories = useMemo(() => {
    if (tempFilter === "all") return categories;
    return categories.filter((c) => c.type === tempFilter);
  }, [categories, tempFilter]);

  const activeCount = useMemo(() => {
    let n = 0;
    if (filter !== "all") n++;
    if (categoryId) n++;
    if (minPrice != null) n++;
    if (maxPrice != null) n++;
    if (sortBy && sortBy !== "best") n++;
    return n;
  }, [filter, categoryId, minPrice, maxPrice, sortBy]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
            className="fixed inset-0 z-[150] bg-black/50 backdrop-blur-sm"
          />

          {/* Drawer */}
          <motion.aside
            key="drawer"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{
              type: "spring",
              stiffness: 320,
              damping: 34,
              mass: 0.8,
            }}
            className="fixed top-0 left-0 z-[160] h-full w-full sm:max-w-[400px] bg-surface border-r border-app flex flex-col shadow-2xl"
          >
            {/* Header */}
            <header className="flex items-center justify-between px-5 py-4 border-b border-app">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-main">Filters</h2>
                {activeCount > 0 && (
                  <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-brand text-[hsl(var(--primary-fg))] text-[10px] font-bold">
                    {activeCount}
                  </span>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-md text-muted hover:text-main hover:bg-surface-2 transition-colors"
                aria-label="Close filters"
              >
                <X size={18} />
              </button>
            </header>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-7">
              {/* Sort */}
              <section>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-faint mb-2.5">
                  Sort by
                </p>
                <div className="flex flex-col gap-1">
                  {SORT_OPTIONS.map((o) => (
                    <button
                      key={o.value}
                      onClick={() => setTempSort(o.value)}
                      className={`flex items-center justify-between w-full px-3.5 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                        tempSort === o.value
                          ? "bg-brand/10 border-brand text-brand"
                          : "bg-surface-2 border-app text-muted hover:text-main hover:border-[hsl(var(--primary)/0.4)]"
                      }`}
                    >
                      {o.label}
                      {tempSort === o.value && (
                        <Check size={14} className="text-brand" />
                      )}
                    </button>
                  ))}
                </div>
              </section>

              {/* Listing type — segmented pill */}
              <section>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-faint mb-2.5">
                  Listing type
                </p>
                <div className="flex gap-1 rounded-lg border border-app bg-surface-2 p-1">
                  {TYPE_OPTIONS.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => handleTypeChange(t.value)}
                      className={`flex-1 py-2 rounded-md text-[12px] font-semibold transition-all ${
                        tempFilter === t.value
                          ? "bg-brand text-[hsl(var(--primary-fg))] shadow-sm"
                          : "text-muted hover:text-main"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </section>

              {/* Category */}
              <section>
                <div className="flex items-center justify-between mb-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-faint">
                    Category
                  </p>
                  {tempCategory && (
                    <button
                      onClick={() => setTempCategory("")}
                      className="text-[10px] text-brand hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={tempFilter}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18 }}
                    className="flex flex-wrap gap-1.5"
                  >
                    <button
                      onClick={() => setTempCategory("")}
                      className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-all ${
                        tempCategory === ""
                          ? "bg-brand text-[hsl(var(--primary-fg))] border-transparent"
                          : "bg-surface-2 border-app text-muted hover:text-main hover:border-[hsl(var(--primary)/0.4)]"
                      }`}
                    >
                      Any
                    </button>
                    {visibleCategories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setTempCategory(cat.id)}
                        className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-all ${
                          tempCategory === cat.id
                            ? "bg-brand text-[hsl(var(--primary-fg))] border-transparent"
                            : "bg-surface-2 border-app text-muted hover:text-main hover:border-[hsl(var(--primary)/0.4)]"
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                    {visibleCategories.length === 0 && (
                      <p className="text-xs text-faint py-1">
                        No categories for this type.
                      </p>
                    )}
                  </motion.div>
                </AnimatePresence>
              </section>

              {/* Price */}
              <section>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-faint mb-2.5">
                  Price range (GH₵)
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    placeholder="Min"
                    value={tempMin}
                    onChange={(e) => setTempMin(e.target.value)}
                    className="w-full bg-surface-2 border border-app rounded-lg px-3 py-2.5 text-sm text-main focus:outline-none focus:border-[hsl(var(--primary))] transition-colors"
                  />
                  <span className="text-faint shrink-0">–</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    placeholder="Max"
                    value={tempMax}
                    onChange={(e) => setTempMax(e.target.value)}
                    className="w-full bg-surface-2 border border-app rounded-lg px-3 py-2.5 text-sm text-main focus:outline-none focus:border-[hsl(var(--primary))] transition-colors"
                  />
                </div>
                <p className="text-[10px] text-faint mt-2">
                  Leave blank for no limit. "Ask for price" listings always
                  appear.
                </p>
              </section>
            </div>

            {/* Footer */}
            <footer className="px-5 py-4 border-t border-app flex gap-2">
              <button
                onClick={reset}
                className="px-4 py-2.5 rounded-lg bg-surface-2 border border-app text-muted text-sm font-semibold hover:text-main transition-colors"
              >
                Reset
              </button>
              <button
                onClick={apply}
                className="flex-1 gradient-brand text-[hsl(var(--primary-fg))] py-2.5 rounded-lg font-semibold text-sm transition-opacity hover:opacity-90"
              >
                Apply filters
              </button>
            </footer>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
