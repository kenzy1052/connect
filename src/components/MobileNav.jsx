import { NavLink, useLocation } from "react-router-dom";
import { Home, Bookmark, PlusCircle, Compass, Settings } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const items = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/browse", icon: Compass, label: "Browse", tourId: "tour-browse" },
  { to: "/create", icon: PlusCircle, label: "Sell", accent: true, tourId: "tour-post" },
  { to: "/account/saved", icon: Bookmark, label: "Saved" },
  { to: "/account", icon: Settings, label: "Settings" },
];

export default function MobileNav() {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const isSettingsActive =
    location.pathname.startsWith("/account") &&
    !location.pathname.startsWith("/account/saved");

  return (
    <nav
      /* Changed border-t to border-t-2 and added border-opacity for visibility */
      className="md:hidden fixed bottom-0 inset-x-0 z-[100] bg-surface border-t-2 border-app flex justify-around items-center"
      style={{
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.5rem)",
        paddingTop: "0.5rem",
      }}
    >
      {items.map(({ to, icon: Icon, label, accent, tourId }) => {
        const isActive =
          to === "/account"
            ? isSettingsActive
            : to === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(to);

        return (
          <NavLink
            key={to}
            to={to}
            end
            data-tour={tourId}
            className={`flex flex-col items-center gap-1 px-3 py-1 transition-colors ${
              isActive && !accent ? "text-brand" : "text-faint"
            }`}
          >
            {accent ? (
              <div className="flex flex-col items-center">
                <div className="h-8 w-10 grid place-items-center rounded-md gradient-brand">
                  <Icon size={20} className="text-[hsl(var(--primary-fg))]" />
                </div>
                <span className="text-[9px] font-bold uppercase tracking-wider mt-1 text-faint">
                  {label}
                </span>
              </div>
            ) : (
              <>
                <Icon
                  size={22}
                  className={isActive ? "text-brand" : "text-faint"}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span
                  className={`text-[9px] font-bold uppercase tracking-wider ${
                    isActive ? "text-brand" : ""
                  }`}
                >
                  {label}
                </span>
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}
