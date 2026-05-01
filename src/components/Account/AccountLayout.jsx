import { useEffect } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  User,
  Phone,
  Package,
  Heart,
  Lock,
  Palette,
  Bell,
  Trash2,
  LogOut,
  ChevronRight,
  ChevronLeft,
  Settings,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export const TABS = [
  { to: "/account/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/account/profile", label: "Profile", icon: User },
  { to: "/account/numbers", label: "Contact Information", icon: Phone },
  { to: "/account/mylistings", label: "My Listings", icon: Package },
  { to: "/account/saved", label: "Saved", icon: Heart },
  { to: "/account/security", label: "Password Update", icon: Lock },
  { to: "/account/notifications", label: "Notifications", icon: Bell },
  { to: "/account/customization", label: "Personalization", icon: Palette },
];

export const DANGER = [
  { to: "/account/delete", label: "Delete Account", icon: Trash2 },
];

const ALL_TABS = [...TABS, ...DANGER];

/* ─────────────────────────────────────────────────────────────────────────────
 * AccountIndex — shown in the desktop content area when no tab is selected.
 * On mobile this is never rendered — AccountLayout shows the tab list instead.
 * ───────────────────────────────────────────────────────────────────────────── */
export function AccountIndex() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center select-none">
      <div className="w-16 h-16 rounded-2xl gradient-brand grid place-items-center mb-5 shadow-[0_8px_24px_hsl(var(--primary)/0.3)]">
        <Settings size={28} className="text-[hsl(var(--primary-fg))]" />
      </div>
      <h2 className="text-lg font-semibold text-main">Account Settings</h2>
      <p className="text-sm text-muted mt-1 max-w-xs">
        Select a section from the sidebar to manage your account.
      </p>
      <div className="mt-8 grid grid-cols-2 gap-3 w-full max-w-sm">
        {TABS.slice(0, 4).map(({ to, label, icon: Icon }) => (
          <button
            key={to}
            onClick={() => navigate(to)}
            className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-app bg-surface hover:bg-surface-2 transition-colors text-sm font-medium text-muted hover:text-main text-left"
          >
            <Icon size={15} className="shrink-0 text-brand" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * AccountLayout
 *
 * DESKTOP (md+):
 *   - html scroll is locked so the window never scrolls.
 *   - Left sidebar (272px): header (sticky) + nav (scrolls) + footer (sticky).
 *   - Right content area (flex-1): scrolls independently from the sidebar.
 *   Both panels share exactly calc(100vh - 7rem) — the remaining viewport
 *   after the sticky top nav (h-16 TopNav + h-11 SecondaryBar = ~7rem).
 *
 * MOBILE:
 *   - /account        → full-screen settings menu (list of tabs).
 *   - /account/*      → content page with a sticky "← Settings" back header.
 * ───────────────────────────────────────────────────────────────────────────── */
export default function AccountLayout() {
  const { profile, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isRootAccount =
    location.pathname === "/account" || location.pathname === "/account/";

  const initials = (
    profile?.business_name ||
    profile?.full_name ||
    user?.email ||
    "?"
  )
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleLogout = async () => {
    await logout();
    navigate("/signin");
  };

  const currentTab = ALL_TABS.find((t) => location.pathname.startsWith(t.to));

  /*
   * Lock page scroll on desktop so both panels scroll independently.
   * We inject a <style> tag scoped to md+ so mobile is unaffected.
   * Cleaned up on unmount to restore normal scrolling everywhere else.
   */
  useEffect(() => {
    const tag = document.createElement("style");
    tag.id = "account-layout-scroll-lock";
    tag.textContent =
      "@media (min-width: 768px) { html, body { overflow: hidden !important; } }";
    document.head.appendChild(tag);
    return () => {
      const el = document.getElementById("account-layout-scroll-lock");
      if (el) el.remove();
    };
  }, []);

  const UserHeader = () => (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl gradient-brand grid place-items-center text-[hsl(var(--primary-fg))] font-bold text-sm overflow-hidden shrink-0 shadow-sm">
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          initials
        )}
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-main truncate">
          {profile?.business_name || profile?.full_name || "You"}
        </div>
        <div className="text-[11px] text-faint truncate">{user?.email}</div>
      </div>
    </div>
  );

  return (
    /*
     * Negative margins cancel MainApp's px-4/py-5 (md: px-6/py-7) padding so
     * we paint edge-to-edge inside the max-w-7xl container.
     *
     * On desktop the outer div is given a fixed height equal to the viewport
     * minus the combined nav height (~7rem). Because html/body overflow is
     * locked above, the window never scrolls — only the inner panels do.
     */
    <div
      className="-mx-4 sm:-mx-6 -my-5 md:-my-7 flex flex-col md:flex-row bg-app"
      style={{
        // Mobile: auto height (normal page scroll)
        // Desktop: locked to remaining viewport after nav
        minHeight: "calc(100vh - 7rem)",
      }}
    >
      {/* ════════════════════════════════════════════════════════════════
          DESKTOP SIDEBAR — fixed height, independent scroll
      ══════════════════════════════════════════════════════════════════ */}
      <aside
        className="hidden md:flex flex-col shrink-0 bg-surface border-r border-app"
        style={{
          width: 272,
          height: "calc(100vh - 7rem)",
          overflow: "hidden", // clips the flex column; inner nav scrolls
        }}
      >
        {/* Sticky header */}
        <div className="shrink-0 px-5 pt-6 pb-4 border-b border-app">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-faint mb-3">
            My Account
          </p>
          <UserHeader />
        </div>

        {/* Independently scrollable nav */}
        <nav className="flex-1 overflow-y-auto py-3 flex flex-col gap-0.5 px-3">
          {TABS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end
              className={({ isActive }) =>
                `relative flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                  isActive
                    ? "bg-brand-soft text-brand"
                    : "text-muted hover:text-main hover:bg-surface-2"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-brand -ml-[1px]" />
                  )}
                  <Icon size={16} className="shrink-0" />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Sticky footer — danger zone + logout */}
        <div className="shrink-0 border-t border-app px-3 py-3 flex flex-col gap-0.5">
          {DANGER.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                  isActive
                    ? "bg-[hsl(var(--danger)/0.12)] text-[hsl(var(--danger))]"
                    : "text-[hsl(var(--danger))] hover:bg-[hsl(var(--danger)/0.08)]"
                }`
              }
            >
              <Icon size={16} className="shrink-0" />
              {label}
            </NavLink>
          ))}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-muted hover:text-main hover:bg-surface-2 rounded-lg transition-colors"
          >
            <LogOut size={16} className="shrink-0" />
            Log out
          </button>
        </div>
      </aside>

      {/* ════════════════════════════════════════════════════════════════
          MOBILE — one panel shown at a time
      ══════════════════════════════════════════════════════════════════ */}
      <div className="md:hidden w-full">
        {isRootAccount ? (
          /* ── Mobile: Settings tab list ── */
          <div className="bg-app min-h-screen">
            <div className="px-4 py-4 border-b border-app bg-surface">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-faint mb-3">
                Settings
              </p>
              <UserHeader />
            </div>

            <nav className="divide-y divide-app">
              {TABS.map(({ to, label, icon: Icon }) => (
                <button
                  key={to}
                  onClick={() => navigate(to)}
                  className="w-full flex items-center justify-between px-5 py-4 text-sm font-medium text-main hover:bg-surface-2 active:bg-surface-2 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Icon size={18} className="text-brand shrink-0" />
                    {label}
                  </div>
                  <ChevronRight size={15} className="text-faint" />
                </button>
              ))}
            </nav>

            <div className="mt-2 border-t border-app divide-y divide-app">
              {DANGER.map(({ to, label, icon: Icon }) => (
                <button
                  key={to}
                  onClick={() => navigate(to)}
                  className="w-full flex items-center justify-between px-5 py-4 text-sm font-medium text-[hsl(var(--danger))] hover:bg-[hsl(var(--danger)/0.06)] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Icon size={18} className="shrink-0" />
                    {label}
                  </div>
                  <ChevronRight size={15} className="opacity-50" />
                </button>
              ))}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-5 py-4 text-sm font-medium text-[hsl(var(--danger))] hover:bg-[hsl(var(--danger)/0.06)] transition-colors"
              >
                <LogOut size={18} className="shrink-0" />
                Log out
              </button>
            </div>

            {/* Space for mobile nav bar */}
            <div className="h-24" />
          </div>
        ) : (
          /* ── Mobile: Individual content page ── */
          <div className="bg-app min-h-screen">
            <div className="flex items-center gap-2 px-4 h-12 border-b border-app bg-surface sticky top-0 z-10">
              <button
                onClick={() => navigate("/account")}
                className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-main transition-colors py-1 pr-2"
              >
                <ChevronLeft size={16} />
                Settings
              </button>
              {currentTab && (
                <>
                  <span className="text-faint text-sm">/</span>
                  <span className="text-sm font-medium text-main truncate">
                    {currentTab.label}
                  </span>
                </>
              )}
            </div>
            <div className="px-4 py-6 pb-28">
              <Outlet />
            </div>
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════
          DESKTOP content area — fixed height, independent scroll
      ══════════════════════════════════════════════════════════════════ */}
      <main
        className="hidden md:flex flex-col flex-1 bg-app"
        style={{
          height: "calc(100vh - 7rem)",
          overflow: "hidden",
        }}
      >
        {/* Breadcrumb strip */}
        {currentTab && (
          <div className="shrink-0 px-8 pt-8 pb-2 border-b border-app">
            <div className="flex items-center gap-2">
              <currentTab.icon size={13} className="text-brand" />
              <p className="text-[10px] font-semibold uppercase tracking-widest text-faint">
                {currentTab.label}
              </p>
            </div>
          </div>
        )}

        {/* Independently scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 pb-10 pt-6">
          <div className="max-w-3xl mx-auto">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
