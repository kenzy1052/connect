import { Link, NavLink } from "react-router-dom";
import { SlidersHorizontal, HelpCircle, Package } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

/**
 * SecondaryBar — Filter / FAQ / My Listings.
 * Sits directly under TopNav. Animates with NavShell as one unit.
 */
export default function SecondaryBar({ onFilterClick }) {
  const { user } = useAuth();
  return (
    <div className="relative z-[110] bg-surface-2 backdrop-blur-xl border-b border-app">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 h-11 flex items-center gap-1 text-xs">
        <button
          type="button"
          onClick={onFilterClick}
          className="inline-flex items-center gap-1.5 px-3 h-8 rounded-md text-muted hover:text-main hover:bg-surface-2 transition-colors font-medium"
        >
          <SlidersHorizontal size={14} /> Filter
        </button>

        <NavLink
          to="/help"
          className={({ isActive }) =>
            `inline-flex items-center gap-1.5 px-3 h-8 rounded-md font-medium transition-colors ${
              isActive ? "text-main bg-surface-2" : "text-muted hover:text-main hover:bg-surface-2"
            }`
          }
        >
          <HelpCircle size={14} /> FAQ / Help
        </NavLink>

        <div className="ml-auto">
          {user && (
            <Link
              to="/account/mylistings"
              className="inline-flex items-center gap-1.5 px-3 h-8 rounded-md text-muted hover:text-main hover:bg-surface-2 transition-colors font-medium"
            >
              <Package size={14} /> My Listings
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
