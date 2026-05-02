import { useEffect, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useDiscoveryFeed } from "./hooks/useDiscoveryFeed";
import { FeedFilters } from "./components/Feed/FeedFilters";
import { useAuth } from "./context/AuthContext";
import NavShell from "./components/Layout/NavShell";
import TopNav from "./components/Layout/TopNav";
import SecondaryBar from "./components/Layout/SecondaryBar";
import HeroSection from "./components/Layout/HeroSection";
import Footer from "./components/Layout/Footer";
import OfflineBanner from "./components/Layout/OfflineBanner";

export default function MainApp() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isAdmin = profile?.role === "admin";
  const isHome = location.pathname === "/";
  const isBrowse = location.pathname === "/browse";
  const isFeedView = isHome || isBrowse;

  const [filtersOpen, setFiltersOpen] = useState(false);

  const {
    listings,
    loading,
    isInitialLoading,
    error,
    hasMore,
    loadMore,
    refetch,
    filter,
    setFilter,
    categoryId,
    setCategoryId,
    searchTerm,
    setSearchTerm,
    minPrice,
    setMinPrice,
    maxPrice,
    setMaxPrice,
    sortBy,
    setSortBy,
    categories,
  } = useDiscoveryFeed();

  const [dismissedError, setDismissedError] = useState(false);

  // Reset dismiss when error message changes
  useEffect(() => {
    setDismissedError(false);
  }, [error]);

  // Read ?category= from URL and pre-populate the category filter
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlCat = params.get("category");
    if (urlCat) {
      setCategoryId(urlCat);
    } else {
      // Clear category when navigating away from a category URL
      setCategoryId("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  const observerTarget = useRef(null);

  useEffect(() => {
    const el = observerTarget.current;
    // On the home page we cap to 30 items — pagination only on /browse.
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading && hasMore && isBrowse) {
          loadMore();
        }
      },
      { rootMargin: "200px" },
    );
    if (el) observer.observe(el);
    return () => el && observer.unobserve(el);
  }, [loading, hasMore, loadMore, isBrowse]);

  const openDetailView = (listing) => {
    navigate(`/listing/${listing.id}`, { state: { listing } });
  };

  // Cap home feed
  const visibleListings = isHome ? listings.slice(0, 30) : listings;

  return (
    <div className="min-h-screen bg-app text-main font-sans flex flex-col">
      <NavShell>
        <TopNav />
        <SecondaryBar onFilterClick={() => setFiltersOpen((v) => !v)} />
      </NavShell>

      <OfflineBanner />

      {/* Hero is full-bleed and 100vh on the home page only */}
      {isHome && <HeroSection />}

      <main className="flex-1 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 md:py-7 pb-24 md:pb-10">
          {isFeedView && (
            <FeedFilters
              open={filtersOpen}
              onClose={() => setFiltersOpen(false)}
              categories={categories}
              filter={filter}
              setFilter={setFilter}
              categoryId={categoryId}
              setCategoryId={setCategoryId}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              minPrice={minPrice}
              setMinPrice={setMinPrice}
              maxPrice={maxPrice}
              setMaxPrice={setMaxPrice}
              sortBy={sortBy}
              setSortBy={setSortBy}
            />
          )}

          {error && !dismissedError && (
            <div
              className="mb-6 rounded-md overflow-hidden"
              style={{
                background: "hsl(var(--danger)/0.1)",
                border: "1px solid hsl(var(--danger)/0.3)",
              }}
            >
              <div className="flex items-start gap-3 px-4 pt-3 pb-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-4 h-4 shrink-0 mt-0.5"
                  style={{ color: "hsl(var(--danger))" }}
                >
                  <path
                    fillRule="evenodd"
                    d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z"
                    clipRule="evenodd"
                  />
                </svg>
                <span
                  className="flex-1 text-xs"
                  style={{ color: "hsl(var(--danger))" }}
                >
                  {error}
                </span>
              </div>
              <div className="px-4 pb-3 flex justify-end">
                <button
                  onClick={() => setDismissedError(true)}
                  className="text-[11px] font-bold px-3 py-1 rounded-lg transition-colors"
                  style={{
                    background: "hsl(var(--danger)/0.15)",
                    color: "hsl(var(--danger))",
                  }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          <div key={location.pathname + location.search}>
            <Outlet
              context={{
                user,
                isAdmin,
                listings: visibleListings,
                fullListings: listings,
                loading,
                isInitialLoading,
                hasMore: isBrowse ? hasMore : false,
                observerTarget,
                openDetailView,
                refetch,
                isHome,
                isBrowse,
              }}
            />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
