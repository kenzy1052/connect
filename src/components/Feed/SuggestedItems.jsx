import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { FeedCard } from "./FeedCard";
import { Loader2 } from "lucide-react";

export default function SuggestedItems({
  categoryId,
  currentListingId,
  onListingClick,
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!categoryId) {
      setLoading(false);
      return;
    }

    async function fetchSuggested() {
      setLoading(true);
      const { data, error } = await supabase
        .from("discovery_feed")
        .select("*")
        .eq("category_id", categoryId)
        .eq("is_active", true)
        .eq("is_deleted", false)
        .neq("id", currentListingId)
        .order("created_at", { ascending: false })
        .limit(6);

      if (error) {
        console.error("Error fetching suggested items:", error);
      } else {
        setItems(data || []);
      }
      setLoading(false);
    }

    fetchSuggested();
  }, [categoryId, currentListingId]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-white">Similar listings</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {items.map((item) => (
          <FeedCard
            key={item.id}
            item={item}
            onClick={() => onListingClick(item)}
          />
        ))}
      </div>
    </div>
  );
}
