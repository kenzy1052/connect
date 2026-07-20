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
    <div className="flex items-center gap-3.5">
      <div className="w-12 h-12 rounded-full gradient-brand flex items-center justify-center text-[hsl(var(--primary-fg))] font-bold text-sm overflow-hidden shrink-0 shadow-sm border-2 border-surface">
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
        <div className="text-base font-bold text-main truncate leading-tight">
          {profile?.business_name || profile?.full_name || "You"}
        </div>
        <div className="text-xs text-muted truncate mt-0.5">{user?.email}</div>
      </div>
    </div>
  );

  return (
    <div
      className="-mx-4 sm:-mx-6 -my-5 md:-my-7 flex flex-col md:flex-row bg-app"
      style={{
        minHeight: "calc(100vh - 7rem)",
      }}
    >
      {/* ════════════════════════════════════════════════════════════════
          DESKTOP SIDEBAR
      ══════════════════════════════════════════════════════════════════ */}
      <aside
        className="hidden md:flex flex-col shrink-0 bg-surface border-r border-app"
        style={{
          width: 272,
          height: "calc(100vh - 7rem)",
          overflow: "hidden",
        }}
      >
        <div className="shrink-0 px-5 pt-6 pb-4 border-b border-app">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-faint mb-3">
            My Account
          </p>
          <UserHeader />
        </div>

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
          MOBILE VIEW
      ══════════════════════════════════════════════════════════════════ */}
      <div className="md:hidden w-full">
        {isRootAccount ? (
          /* ── Mobile: Settings tab list (Modern Inset Layout) ── */
          <div className="bg-app min-h-screen pb-24">
            {/* Header Area */}
            <div className="px-5 pt-8 pb-4">
              <h1 className="text-2xl font-bold text-main tracking-tight">
                Settings
              </h1>
            </div>

            <div className="px-4 space-y-6">
              {/* Profile Card */}
              <div
                className="bg-surface border border-app rounded-2xl p-4 shadow-sm flex items-center justify-between active:bg-surface-2 transition-colors cursor-pointer"
                onClick={() => navigate("/account/profile")}
              >
                <UserHeader />
                <ChevronRight size={18} className="text-faint" />
              </div>

              {/* Main Navigation Group */}
              <nav className="bg-surface border border-app rounded-2xl shadow-sm overflow-hidden flex flex-col">
                {TABS.map(({ to, label, icon: Icon }, index) => (
                  <button
                    key={to}
                    onClick={() => navigate(to)}
                    className={`w-full flex items-center justify-between px-4 py-3.5 active:bg-surface-2 transition-colors ${
                      index !== TABS.length - 1 ? "border-b border-app" : ""
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-brand-soft flex items-center justify-center shrink-0">
                        <Icon size={16} className="text-brand" />
                      </div>
                      <span className="text-sm font-semibold text-main">
                        {label}
                      </span>
                    </div>
                    <ChevronRight size={16} className="text-faint" />
                  </button>
                ))}
              </nav>

              {/* Danger / Account Actions Group */}
              <div className="bg-surface border border-app rounded-2xl shadow-sm overflow-hidden flex flex-col">
                {DANGER.map(({ to, label, icon: Icon }) => (
                  <button
                    key={to}
                    onClick={() => navigate(to)}
                    className="w-full flex items-center justify-between px-4 py-3.5 border-b border-app active:bg-[hsl(var(--danger)/0.06)] transition-colors group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-[hsl(var(--danger)/0.1)] flex items-center justify-center shrink-0">
                        <Icon size={16} className="text-[hsl(var(--danger))]" />
                      </div>
                      <span className="text-sm font-semibold text-[hsl(var(--danger))]">
                        {label}
                      </span>
                    </div>
                    <ChevronRight
                      size={16}
                      className="opacity-50 text-[hsl(var(--danger))]"
                    />
                  </button>
                ))}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-between px-4 py-3.5 active:bg-surface-2 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center shrink-0">
                      <LogOut size={16} className="text-muted" />
                    </div>
                    <span className="text-sm font-semibold text-muted">
                      Log out
                    </span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ── Mobile: Individual content page ── */
          <div className="bg-app min-h-screen">
            <div className="flex items-center gap-2 px-4 h-14 border-b border-app bg-surface/90 backdrop-blur-md sticky top-0 z-10 shadow-sm">
              <button
                onClick={() => navigate("/account")}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:opacity-80 transition-opacity py-2 pr-2"
              >
                <ChevronLeft size={18} />
                Settings
              </button>
              {currentTab && (
                <>
                  <span className="text-faint text-sm">/</span>
                  <span className="text-sm font-semibold text-main truncate">
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
          DESKTOP CONTENT AREA
      ══════════════════════════════════════════════════════════════════ */}
      <main
        className="hidden md:flex flex-col flex-1 bg-app"
        style={{
          height: "calc(100vh - 7rem)",
          overflow: "hidden",
        }}
      >
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

        <div className="flex-1 overflow-y-auto px-4 sm:px-8 pb-10 pt-6">
          <div className="max-w-3xl mx-auto">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
