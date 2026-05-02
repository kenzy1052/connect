import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  PlusCircle,
  LogIn,
  Search,
  LogOut,
  Settings as SettingsIcon,
  User as UserIcon,
  Compass,
  Sun,
  Moon,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import NotificationBell from "../Notifications/NotificationBell";
import Logo from "./Logo";

export default function TopNav({ onOpenFilters }) {
  const { user, profile, logout } = useAuth();
  const { mode, toggleMode } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => setMenuOpen(false), [location.pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [menuOpen]);

  const isAdmin = profile?.role === "admin";
  const initials = (profile?.business_name || profile?.full_name || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const submitSearch = (e) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  // Shared class — always visibly distinct from nav bg in every theme/mode
  const hoverBtn =
    "text-muted hover:text-main hover:bg-surface-hover transition-colors";

  return (
    <>
      {/* ── DESKTOP (md+) ─────────────────────────────────────────── */}
      <header className="hidden md:block relative z-[140] bg-surface backdrop-blur-xl border-b border-app shadow-[0_4px_16px_hsl(var(--text)/0.08)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center gap-3 md:gap-5">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-2 shrink-0 group">
            <div className="w-8 h-8 rounded-md gradient-brand grid place-items-center shadow-[0_4px_14px_hsl(var(--primary)/0.4)]">
              <Logo className="w-5 h-5 text-[hsl(var(--primary-fg))]" />
            </div>
            <span className="hidden sm:inline text-base font-bold tracking-tight text-main">
              CampusConnect
            </span>
          </Link>

          {/* Search */}
          <form
            onSubmit={submitSearch}
            className="flex-1 max-w-2xl mx-auto relative"
          >
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint pointer-events-none"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search listings, services, students…"
              className="w-full bg-surface-2 border border-app focus:border-[hsl(var(--primary))]
                         text-sm text-main placeholder:text-faint
                         rounded-md pl-10 pr-4 h-10 outline-none transition-colors"
            />
          </form>

          {/* Right cluster */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <Link
              to="/browse"
              className={`hidden md:inline-flex items-center gap-1.5 h-10 px-3 rounded-md text-sm font-medium ${hoverBtn}`}
            >
              <Compass size={16} />
              Browse All
            </Link>

            <button
              onClick={toggleMode}
              aria-label="Toggle light/dark"
              className={`h-10 w-10 grid place-items-center rounded-md ${hoverBtn}`}
            >
              {mode === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {user && (
              <button
                onClick={() => navigate("/create")}
                className="hidden sm:inline-flex items-center gap-1.5 gradient-brand text-[hsl(var(--primary-fg))] h-10 px-3.5 rounded-md text-sm font-semibold transition-all shadow-[0_2px_10px_hsl(var(--primary)/0.35)]"
              >
                <PlusCircle size={16} />
                Post
              </button>
            )}

            {user && <NotificationBell />}

            {!user && (
              <button
                onClick={() => navigate("/signin")}
                className="inline-flex items-center gap-1.5 gradient-brand text-[hsl(var(--primary-fg))] h-10 px-3.5 rounded-md text-sm font-semibold"
              >
                <LogIn size={16} />
                <span>Sign in</span>
              </button>
            )}

            {user && (
              <div className="relative" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => setMenuOpen((p) => !p)}
                  className={`w-10 h-10 rounded-md overflow-hidden grid place-items-center
                               bg-surface-2 border border-app text-main font-semibold text-sm transition-all
                               ${menuOpen ? "ring-2 ring-brand" : "hover:border-[hsl(var(--primary))] hover:bg-surface-hover"}`}
                  aria-label="Open profile menu"
                >
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    initials
                  )}
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-12 z-[180] w-60 bg-surface border border-app rounded-md shadow-2xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-app">
                      <p className="text-sm font-semibold text-main truncate">
                        {profile?.business_name ||
                          profile?.full_name ||
                          "Your account"}
                      </p>
                      <p className="text-[11px] text-faint truncate mt-0.5">
                        {user.email}
                      </p>
                    </div>
                    <MenuLink to="/account" Icon={SettingsIcon}>
                      Settings
                    </MenuLink>
                    {isAdmin && (
                      <MenuLink
                        to="/admin"
                        Icon={UserIcon}
                        accent="text-[hsl(var(--danger))]"
                      >
                        Admin
                      </MenuLink>
                    )}
                    <button
                      onClick={async () => {
                        setMenuOpen(false);
                        await logout();
                        navigate("/signin");
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-[hsl(var(--danger))]
                                 hover:bg-[hsl(var(--danger)/0.08)] transition-colors border-t border-app"
                    >
                      <LogOut size={15} />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── MOBILE (< md): two rows ──────────────────────────────── */}
      <header className="md:hidden sticky top-0 z-[140] bg-surface border-b border-app shadow-[0_2px_12px_hsl(var(--text)/0.07)]">
        {/* Row 1: Logo + name | theme + bell + avatar */}
        <div className="flex items-center justify-between px-4 h-14">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <Logo className="h-6 w-6 text-brand" />
            <span className="text-[15px] font-bold tracking-tight text-main">
              CampusConnect
            </span>
          </Link>

          <div className="flex items-center gap-1">
            <button
              onClick={toggleMode}
              aria-label="Toggle light/dark"
              className={`h-9 w-9 grid place-items-center rounded-md ${hoverBtn}`}
            >
              {mode === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {user && <NotificationBell />}

            {!user && (
              <button
                onClick={() => navigate("/signin")}
                className="inline-flex items-center gap-1 gradient-brand text-[hsl(var(--primary-fg))] h-9 px-3 rounded-md text-sm font-semibold ml-1"
              >
                <LogIn size={14} />
                Sign in
              </button>
            )}

            {user && (
              <div
                className="relative ml-0.5"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => setMenuOpen((p) => !p)}
                  className={`w-9 h-9 rounded-md overflow-hidden grid place-items-center
                               bg-surface-2 border border-app text-main font-semibold text-sm transition-all
                               ${menuOpen ? "ring-2 ring-brand" : "hover:bg-surface-hover"}`}
                  aria-label="Open profile menu"
                >
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    initials
                  )}
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-11 z-[180] w-56 bg-surface border border-app rounded-md shadow-2xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-app">
                      <p className="text-sm font-semibold text-main truncate">
                        {profile?.business_name ||
                          profile?.full_name ||
                          "Your account"}
                      </p>
                      <p className="text-[11px] text-faint truncate mt-0.5">
                        {user.email}
                      </p>
                    </div>
                    <MenuLink to="/account" Icon={SettingsIcon}>
                      Settings
                    </MenuLink>
                    {isAdmin && (
                      <MenuLink
                        to="/admin"
                        Icon={UserIcon}
                        accent="text-[hsl(var(--danger))]"
                      >
                        Admin
                      </MenuLink>
                    )}
                    <button
                      onClick={async () => {
                        setMenuOpen(false);
                        await logout();
                        navigate("/signin");
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-[hsl(var(--danger))]
                                 hover:bg-[hsl(var(--danger)/0.08)] transition-colors border-t border-app"
                    >
                      <LogOut size={15} />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Row 2: search bar + search button */}
        <div className="flex items-center gap-2 px-4 pb-3">
          <form
            onSubmit={submitSearch}
            className="flex-1 flex items-center gap-2 relative"
          >
            <div className="flex-1 relative">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-faint pointer-events-none"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search listings…"
                className="w-full bg-surface-2 border border-app focus:border-[hsl(var(--primary))]
                           text-sm text-main placeholder:text-faint
                           rounded-md pl-9 pr-3 h-9 outline-none transition-colors"
              />
            </div>
            <button
              type="submit"
              aria-label="Search"
              className="h-9 px-3.5 shrink-0 inline-flex items-center gap-1.5 rounded-md gradient-brand text-[hsl(var(--primary-fg))] text-xs font-semibold transition-opacity hover:opacity-90 active:scale-95"
            >
              <Search size={14} />
            </button>
          </form>
        </div>
      </header>
    </>
  );
}

function MenuLink({ to, Icon, children, accent = "text-muted" }) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-surface-hover hover:text-main transition-colors ${accent}`}
    >
      <Icon size={15} />
      {children}
    </Link>
  );
}
