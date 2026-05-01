import React, { Suspense, lazy, useEffect, useRef, useState } from "react";
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useOutletContext,
  useParams,
} from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { supabase } from "./lib/supabaseClient";

import MainApp from "./MainApp";
import { FeedList } from "./components/Feed/FeedList";
import MobileNav from "./components/MobileNav";
import ScrollManager from "./ScrollManager";
import NotFound from "./components/Layout/NotFound";

/* Lazy-loaded routes — keeps initial bundle lean for 25k+ users */
const ListingDetail = lazy(() => import("./components/Feed/ListingDetail"));
const CreateListing = lazy(() =>
  import("./components/Feed/CreateListing").then((m) => ({ default: m.CreateListing }))
);
const AdminPanel = lazy(() => import("./components/Admin/AdminPanel"));
const SellerProfile = lazy(() => import("./pages/SellerProfile"));
const SearchResults = lazy(() => import("./pages/SearchResults"));

const AccountLayout = lazy(() => import("./components/Account/AccountLayout"));
const DashboardTab = lazy(() => import("./components/Account/tabs/DashboardTab"));
const ProfileTab = lazy(() => import("./components/Account/tabs/ProfileTab"));
const NumbersTab = lazy(() => import("./components/Account/tabs/NumbersTab"));
const MyListingsTab = lazy(() => import("./components/Account/tabs/MyListingsTab"));
const SavedTab = lazy(() => import("./components/Account/tabs/SavedTab"));
const SecurityTab = lazy(() => import("./components/Account/tabs/SecurityTab"));
const CustomizationTab = lazy(() => import("./components/Account/tabs/CustomizationTab"));
const NotificationsTab = lazy(() => import("./components/Account/tabs/NotificationsTab"));
const DeleteProfileTab = lazy(() => import("./components/Account/tabs/DeleteProfileTab"));

const AuthSignIn = lazy(() => import("./components/Auth/AuthSignIn"));
const AuthSignUp = lazy(() => import("./components/Auth/AuthSignUp"));
const AuthForgotPassword = lazy(() => import("./components/Auth/AuthForgotPassword"));
const AuthResetPassword = lazy(() => import("./components/Auth/AuthResetPassword"));

const About = lazy(() => import("./pages/About"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const NeedHelp = lazy(() => import("./pages/NeedHelp"));
const InformationTab = lazy(() =>
  import("./pages/NeedHelp").then((m) => ({ default: m.InformationTab }))
);
const FAQTab = lazy(() =>
  import("./pages/NeedHelp").then((m) => ({ default: m.FAQTab }))
);
const Safety = lazy(() => import("./pages/Safety"));
const CustomerSupport = lazy(() => import("./pages/CustomerSupport"));

function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-app gap-4">
      <div className="w-10 h-10 border-4 border-[hsl(var(--primary)/0.2)] border-t-[hsl(var(--primary))] rounded-full animate-spin" />
      <p className="text-sm text-faint">Initializing session…</p>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
 * RequireAuth — now FORWARDS MainApp's context to children
 * ──────────────────────────────────────────────────────────────── */
function RequireAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const ctx = useOutletContext(); // grab MainApp's context
  if (loading) return <LoadingScreen />;
  if (!user) {
    return (
      <Navigate
        to="/signin"
        state={{ from: location.pathname + location.search }}
        replace
      />
    );
  }
  return <Outlet context={ctx} />; // forward to children
}

function GuestOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user) return <Navigate to="/" replace />;
  return children;
}

function FeedRoute() {
  const {
    listings,
    isInitialLoading,
    loading,
    hasMore,
    observerTarget,
    openDetailView,
    isHome,
    isBrowse,
  } = useOutletContext();

  if (isInitialLoading) {
    return (
      <div className="flex justify-center py-32">
        <div className="w-10 h-10 border-4 border-[hsl(var(--primary)/0.2)] border-t-[hsl(var(--primary))] rounded-full animate-spin" />
      </div>
    );
  }
  return (
    <>
      {isBrowse && (
        <header className="mb-6">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-faint">All listings</p>
          <h1 className="mt-1 text-2xl md:text-3xl font-bold text-main">Browse everything</h1>
          <p className="mt-1 text-sm text-muted">Every active listing, paginated and ready to explore.</p>
        </header>
      )}
      {isHome && listings.length > 0 && (
        <header className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-faint">Fresh on campus</p>
            <h2 className="mt-1 text-xl md:text-2xl font-bold text-main">Latest listings</h2>
          </div>
        </header>
      )}
      <FeedList listings={listings} onListingClick={openDetailView} />
      <div ref={observerTarget} className="h-32 flex justify-center items-center">
        {loading && isBrowse && <p className="text-xs text-brand">Loading more…</p>}
        {!hasMore && isBrowse && listings.length > 0 && (
          <p className="text-xs text-faint">You&apos;ve seen everything</p>
        )}
      </div>
    </>
  );
}

function ListingDetailRoute() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [listing, setListing] = useState(location.state?.listing ?? null);
  const scrollY = useRef(location.state?.scrollY ?? 0);

  useEffect(() => {
    if (listing && listing.id === id) return;
    supabase
      .from("discovery_feed")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        if (data) setListing(data);
      });
  }, [id, listing]);

  const handleBack = () =>
    navigate("/", { state: { restoreScrollY: scrollY.current } });
  const handleOpen = (next) => {
    setListing(next);
    navigate(`/listing/${next.id}`, { state: { listing: next } });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <ListingDetail
      key={id} /* force re-mount on id change so skeleton shows */
      listing={listing}
      listingId={id}
      onBack={handleBack}
      onOpen={handleOpen}
    />
  );
}

function CreateRoute() {
  const { user, refetch } = useOutletContext();
  const navigate = useNavigate();
  return (
    <CreateListing
      user={user}
      onCancel={() => navigate("/")}
      onSuccess={() => {
        refetch();
        navigate("/");
      }}
    />
  );
}

function AdminRoute() {
  const { user, profile, loading, profileLoading } = useAuth();
  const location = useLocation();

  // 1. If still initializing auth session, show loader
  if (loading) return <LoadingScreen />;

  // 2. If not logged in at all, bounce to signin
  if (!user) {
    return (
      <Navigate
        to="/signin"
        state={{ from: location.pathname + location.search }}
        replace
      />
    );
  }

  // 3. If logged in but profile still fetching, show loader
  if (profileLoading) return <LoadingScreen />;

  // 4. If profile loaded but not admin, bounce to home
  if (profile?.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  // 5. Authorized
  return <AdminPanel />;
}

/* MyListings shouldn't call useNavigate() inside an inline JSX prop — wrap it */
function MyListingsRoute() {
  const navigate = useNavigate();
  return <MyListings onCreateListing={() => navigate("/create")} />;
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <ScrollManager />
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route
            path="/signin"
            element={<GuestOnly><AuthSignIn /></GuestOnly>}
          />
          <Route
            path="/signup"
            element={<GuestOnly><AuthSignUp /></GuestOnly>}
          />
          <Route
            path="/forgot-password"
            element={<GuestOnly><AuthForgotPassword /></GuestOnly>}
          />
          <Route path="/reset-password" element={<AuthResetPassword />} />
          <Route path="/auth" element={<Navigate to="/signin" replace />} />

          <Route element={<MainApp />}>
            <Route index element={<FeedRoute />} />
            <Route path="browse" element={<FeedRoute />} />
            <Route path="search" element={<SearchResults />} />
            <Route path="listing/:id" element={<ListingDetailRoute />} />
            <Route path="seller/:id" element={<SellerProfile />} />

            <Route path="about" element={<About />} />
            <Route path="privacy" element={<Privacy />} />
            <Route path="terms" element={<Terms />} />
            <Route path="help" element={<NeedHelp />}>
              <Route index element={<InformationTab />} />
              <Route path="information" element={<InformationTab />} />
              <Route path="faq" element={<FAQTab />} />
            </Route>
            <Route path="support" element={<CustomerSupport />} />
            <Route path="safety" element={<Safety />} />

            <Route element={<RequireAuth />}>
              <Route path="create" element={<CreateRoute />} />
              <Route path="admin" element={<AdminRoute />} />

              <Route path="account" element={<AccountLayout />}>
                <Route index element={<Navigate to="/account/customization" replace />} />
                <Route path="dashboard" element={<DashboardTab />} />
                <Route path="profile" element={<ProfileTab />} />
                <Route path="numbers" element={<NumbersTab />} />
                <Route path="mylistings" element={<MyListingsTab />} />
                <Route path="saved" element={<SavedTab />} />
                <Route path="security" element={<SecurityTab />} />
                <Route path="customization" element={<CustomizationTab />} />
                <Route path="notifications" element={<NotificationsTab />} />
                <Route path="delete" element={<DeleteProfileTab />} />
              </Route>
            </Route>

            <Route path="mylistings" element={<Navigate to="/account/mylistings" replace />} />
            <Route path="saved" element={<Navigate to="/account/saved" replace />} />
            <Route path="profile" element={<Navigate to="/account/profile" replace />} />
            <Route path="dashboard" element={<Navigate to="/account/dashboard" replace />} />
            <Route path="settings" element={<Navigate to="/account/customization" replace />} />

            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
      <MobileNav />
    </BrowserRouter>
  );
}
