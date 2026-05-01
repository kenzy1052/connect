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

  const observerTarget = useRef(null);

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

          {error && (
            <div className="p-4 bg-[hsl(var(--danger)/0.1)] border border-[hsl(var(--danger)/0.3)] rounded-md text-[hsl(var(--danger))] text-xs mb-6">
              {error}
            </div>
          )}

          
            <div key={location.pathname + location.search} >
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
