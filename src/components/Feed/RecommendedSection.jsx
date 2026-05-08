// src/components/Feed/RecommendedSection.jsx
import { useAuth } from "../../context/AuthContext";
import { useRecommendations } from "../../hooks/useRecommendations";
import { FeedCard } from "./FeedCard";
import { Sparkles } from "lucide-react";

/**
 * Shows a horizontal "Recommended for you" row driven by the user's
 * browse history (tracked via trackListingView in useRecommendations).
 */
export default function RecommendedSection({ onListingClick }) {
  const { user } = useAuth();
  const { recommended, loading, reason } = useRecommendations(user?.id);

  if (loading || recommended.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles size={15} className="text-brand" />
        <h2 className="text-sm font-black text-main uppercase tracking-widest">
          Recommended for you
        </h2>
        {reason && (
          <span className="text-[10px] text-faint">· based on {reason}</span>
        )}
      </div>

      {/* Horizontal scroll on mobile, grid on larger screens */}
      <div className="flex gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 sm:overflow-visible">
        {recommended.map((item) => (
          <div key={item.id} className="min-w-[160px] sm:min-w-0 flex-shrink-0">
            <FeedCard item={item} onClick={() => onListingClick(item)} />
          </div>
        ))}
      </div>
    </div>
  );
}
