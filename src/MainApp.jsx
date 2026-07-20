// src/MainApp.jsx
// TASK 5 CHANGE: Added <BetaToast /> at the bottom of the return,
// just after <PWAInstallPrompt />. Everything else is identical to original.
// MESSAGING FIX: isMessages — skip footer + padding wrapper on /messages.

import { useEffect, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useDiscoveryFeed } from "./hooks/useDiscoveryFeed";
import { trackListingView } from "./hooks/useRecommendations";
import { usePresenceHeartbeat } from "./hooks/usePresence";
import { FeedFilters } from "./components/Feed/FeedFilters";
import { useAuth } from "./context/AuthContext";
import NavShell from "./components/Layout/NavShell";
import TopNav from "./components/Layout/TopNav";
import SecondaryBar from "./components/Layout/SecondaryBar";
import HeroSection from "./components/Layout/HeroSection";
import Footer from "./components/Layout/Footer";
import OfflineBanner from "./components/Layout/OfflineBanner";
import AdBanner from "./components/Feed/AdBanner";
import PWAInstallPrompt from "./components/PWAInstallPrompt";
import RecommendedSection from "./components/Feed/RecommendedSection";
// ── Task 5: Beta feedback toast ───────────────────────────────────────────────
import BetaToast from "./components/BetaToast";
// ── First-visit guided tour ───────────────────────────────────────────────────
import OnboardingTour from "./components/Onboarding/OnboardingTour";
import { OnboardingProvider } from "./context/OnboardingContext";

export default function MainApp() {
  const { user, profile } = useAuth();
  usePresenceHeartbeat(user?.id);
  const navigate = useNavigate();
  const location = useLocation();

  const isAdmin = profile?.role === "admin";
  const isHome = location.pathname === "/";
  const isBrowse = location.pathname === "/browse";
  const isFeedView = isHome || isBrowse;
  // Messages page gets its own full-height layout with no footer.
  const isMessages = location.pathname === "/messages";

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

  useEffect(() => {
    setDismissedError(false);
  }, [error]);

  /**
   * Read ?category= from the URL.
   * Translates slug → UUID using the already-fetched categories list.
   */
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlCat = params.get("category");

    if (!urlCat) {
      setCategoryId("");
      return;
    }
    if (categories.length === 0) return;

    const found = categories.find((c) => c.slug === urlCat || c.id === urlCat);
    setCategoryId(found ? found.id : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, categories]);

  const observerTarget = useRef(null);

  useEffect(() => {
    const el = observerTarget.current;
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
    trackListingView(listing);
    navigate(`/listing/${listing.id}`, { state: { listing } });
  };

  // Cap home feed to 30 items — pagination only on /browse
  const visibleListings = isHome ? listings.slice(0, 30) : listings;

  const outletCtx = {
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
  };

  return (
    <OnboardingProvider>
      {/* On /messages: h-screen + overflow-hidden so the page fills exactly
          the viewport below the navbar with no footer leaking through. */}
      <div
        className={
          "app-root bg-app text-main font-sans flex flex-col " +
          (isMessages ? "h-screen overflow-hidden" : "min-h-screen")
        }
      >
        <NavShell>
          <TopNav />
          <SecondaryBar onFilterClick={() => setFiltersOpen((v) => !v)} />
        </NavShell>

        <OfflineBanner />

        {/* Hero — home page only */}
        {isHome && <HeroSection />}

        {isMessages ? (
          /* ── Messages layout: full height, no padding, no footer ──
             Still capped at max-w-7xl like every other page — this was
             previously the one route left unconstrained, so on wide
             screens the chat list + thread stretched to the full
             viewport width instead of matching the rest of the app. */
          <main className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <div className="w-full max-w-7xl mx-auto flex-1 min-h-0 flex flex-col">
              <Outlet context={outletCtx} />
            </div>
          </main>
        ) : (
          /* ── All other pages ── */
          <>
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

                {/* Ad banner — feed pages only */}
                {isFeedView && <AdBanner slot="feed-top" />}

                {/* Personalized recommendations — home only */}
                {isHome && <RecommendedSection onListingClick={openDetailView} />}

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
                  <Outlet context={outletCtx} />
                </div>
              </div>
            </main>

            <Footer />
          </>
        )}

        {/* PWA install prompt — floats above mobile nav */}
        <PWAInstallPrompt />

        {/*
         * Beta toast — floats in top-right corner.
         * Appears 1.2s after every fresh app load.
         * Dismissed per-session via sessionStorage.
         * Clicking body → /support (WhatsApp feedback form).
         */}
        <BetaToast />

        {/* First-visit product tour — spotlights nav elements one at a time */}
        <OnboardingTour />
      </div>
    </OnboardingProvider>
  );
}
