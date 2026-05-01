import { useState } from "react";
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
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const TABS = [
  { to: "/account/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/account/profile", label: "Profile", icon: User },
  { to: "/account/numbers", label: "Contact Information", icon: Phone },
  { to: "/account/mylistings", label: "My Listings", icon: Package },
  { to: "/account/saved", label: "Saved", icon: Heart },
  { to: "/account/security", label: "Password Update", icon: Lock },
  { to: "/account/notifications", label: "Notifications", icon: Bell },
  { to: "/account/customization", label: "Personalization", icon: Palette },
];

const DANGER = [
  { to: "/account/delete", label: "Delete Account", icon: Trash2 },
];

const ALL_TABS = [...TABS, ...DANGER];

export default function AccountLayout() {
  const { profile, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isRootAccount = location.pathname === "/account" || location.pathname === "/account/";

  const initials = (profile?.business_name || profile?.full_name || user?.email || "?")
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

  return (
    <div className="-mx-4 sm:-mx-6 -my-5 md:-my-7 min-h-[calc(100vh-7rem)] flex flex-col md:flex-row bg-app">

      {/* DESKTOP sidebar - independent scrolling */}
      <aside className="hidden md:flex flex-col border-r border-app bg-surface" style={{ width: "280px", height: "100vh", overflow: "hidden" }}>
        <div className="px-5 py-5 border-b border-app shrink-0">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-faint">Account</p>
          <div className="mt-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-md gradient-brand grid place-items-center text-[hsl(var(--primary-fg))] font-bold text-sm overflow-hidden shrink-0">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
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
        </div>
        <div className="flex-1 overflow-y-auto">
          <SidebarNav onNav={() => {}} onLogout={handleLogout} />
        </div>
      </aside>

      {/* MOBILE: tab list OR content panel */}
      <div className="md:hidden col-span-full w-full">
        {isRootAccount ? (
          <div className="bg-app min-h-screen">
            <div className="px-4 py-5 border-b border-app bg-surface flex items-center gap-3">
              <div className="w-10 h-10 rounded-md gradient-brand grid place-items-center text-[hsl(var(--primary-fg))] font-bold text-sm overflow-hidden shrink-0">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
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

            <nav className="divide-y divide-app">
              {TABS.map(({ to, label, icon: Icon }) => (
                <button
                  key={to}
                  onClick={() => navigate(to)}
                  className="w-full flex items-center justify-between px-5 py-4 text-sm font-medium text-main hover:bg-surface-2 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Icon size={18} className="text-muted" />
                    {label}
                  </div>
                  <ChevronRight size={16} className="text-faint" />
                </button>
              ))}

              <div className="pt-2 pb-2">
                {DANGER.map(({ to, label, icon: Icon }) => (
                  <button
                    key={to}
                    onClick={() => navigate(to)}
                    className="w-full flex items-center justify-between px-5 py-4 text-sm font-medium text-[hsl(var(--danger))] hover:bg-[hsl(var(--danger)/0.06)] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={18} />
                      {label}
                    </div>
                    <ChevronRight size={16} className="opacity-50" />
                  </button>
                ))}

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-5 py-4 text-sm font-medium text-[hsl(var(--danger))] hover:bg-[hsl(var(--danger)/0.06)] transition-colors"
                >
                  <LogOut size={18} />
                  Log out
                </button>
              </div>
            </nav>
          </div>
        ) : (
          <div className="bg-app min-h-screen">
            <div className="flex items-center gap-2 px-4 h-12 border-b border-app bg-surface sticky top-0 z-10">
              <button
                onClick={() => navigate("/account")}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-main transition-colors"
              >
                <ChevronLeft size={16} />
                Settings
              </button>
              {currentTab && (
                <>
                  <span className="text-faint">/</span>
                  <span className="text-sm font-medium text-main">{currentTab.label}</span>
                </>
              )}
            </div>
            <div className="px-4 py-6">
              <Outlet />
            </div>
          </div>
        )}
      </div>

      {/* DESKTOP content area - independent scrolling */}
      <main className="hidden md:flex flex-col flex-1 bg-app overflow-hidden" style={{ height: "100vh" }}>
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 md:py-10">
          <div className="max-w-3xl mx-auto">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}

function SidebarNav({ onNav, onLogout }) {
  return (
    <nav className="flex flex-col py-3">
      <SidebarSection>
        {TABS.map(({ to, label, icon: Icon }) => (
          <SidebarItem key={to} to={to} Icon={Icon} onNav={onNav}>
            {label}
          </SidebarItem>
        ))}
      </SidebarSection>

      <div className="mt-auto border-t border-app pt-2 shrink-0">
        <SidebarSection>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-muted hover:text-main hover:bg-surface-2 transition-colors rounded-md mx-2"
          >
            <LogOut size={16} /> Logout
          </button>
          {DANGER.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onNav}
              className={({ isActive }) =>
                `mx-2 flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-md transition-colors ${
                  isActive
                    ? "bg-[hsl(var(--danger)/0.12)] text-[hsl(var(--danger))]"
                    : "text-[hsl(var(--danger))] hover:bg-[hsl(var(--danger)/0.08)]"
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </SidebarSection>
      </div>
    </nav>
  );
}

function SidebarSection({ children }) {
  return <div className="flex flex-col gap-0.5">{children}</div>;
}

function SidebarItem({ to, Icon, children, onNav }) {
  return (
    <NavLink
      to={to}
      onClick={onNav}
      end
      className={({ isActive }) =>
        `mx-2 relative flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-md transition-colors ${
          isActive
            ? "bg-brand-soft text-brand"
            : "text-muted hover:text-main hover:bg-surface-2"
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-brand" />
          )}
          <Icon size={16} />
          {children}
        </>
      )}
    </NavLink>
  );
}
