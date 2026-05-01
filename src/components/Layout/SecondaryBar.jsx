import { Link, NavLink } from "react-router-dom";
import { SlidersHorizontal, HelpCircle, Package } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

/**
 * SecondaryBar — Filter / FAQ / My Listings.
 * Sits directly under TopNav. Animates with NavShell as one unit.
 */
export default function SecondaryBar({ onFilterClick }) {
  const { user } = useAuth();

  const btnBase =
    "inline-flex items-center gap-1.5 px-3 h-8 rounded-md font-medium transition-colors text-muted hover:text-main hover:bg-surface-hover";

  return (
    <div className="relative z-[110] bg-surface border-b border-app">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 h-11 flex items-center gap-1 text-xs">
        <button
          type="button"
          onClick={onFilterClick}
          className={`${btnBase} cursor-pointer`}
        >
          <SlidersHorizontal size={14} /> Filter
        </button>

        <NavLink
          to="/help"
          className={({ isActive }) =>
            isActive
              ? "inline-flex items-center gap-1.5 px-3 h-8 rounded-md font-medium transition-colors text-main bg-surface-hover"
              : btnBase
          }
        >
          <HelpCircle size={14} /> FAQ / Help
        </NavLink>

        <div className="ml-auto">
          {user && (
            <Link to="/account/mylistings" className={btnBase}>
              <Package size={14} /> My Listings
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
