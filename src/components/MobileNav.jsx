import { NavLink } from "react-router-dom";
import { Home, Bookmark, PlusCircle, Compass, LayoutDashboard } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const items = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/browse", icon: Compass, label: "Browse" },
  { to: "/create", icon: PlusCircle, label: "Sell", accent: true },
  { to: "/account/saved", icon: Bookmark, label: "Saved" },
  { to: "/account", icon: LayoutDashboard, label: "Dashboard" },
];

export default function MobileNav() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-[100] bg-surface border-t border-app flex justify-around items-center
                 shadow-[0_-8px_28px_hsl(var(--text)/0.1)]"
      style={{
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.4rem)",
        paddingTop: "0.4rem",
      }}
    >
      {items.map(({ to, icon: Icon, label, accent }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors ${
              accent
                ? "text-[hsl(var(--primary-fg))]"
                : isActive
                  ? "text-brand"
                  : "text-faint hover:text-main"
            }`
          }
        >
          {({ isActive }) =>
            accent ? (
              <>
                <span className="h-9 w-9 grid place-items-center rounded-xl gradient-brand shadow-[0_4px_14px_hsl(var(--primary)/0.4)] -mt-5">
                  <Icon size={20} className="text-[hsl(var(--primary-fg))]" />
                </span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-faint mt-0.5">
                  {label}
                </span>
              </>
            ) : (
              <>
                <Icon size={21} />
                <span
                  className={`text-[9px] font-bold uppercase tracking-wider ${isActive ? "text-brand" : ""}`}
                >
                  {label}
                </span>
              </>
            )
          }
        </NavLink>
      ))}
    </nav>
  );
}
