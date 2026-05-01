import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bookmark } from "lucide-react";
import { supabase } from "../../../lib/supabaseClient";
import { useAuth } from "../../../context/AuthContext";
import { FeedList } from "../../Feed/FeedList";
import { GridSkeleton } from "../../UI/Skeleton"; // Added import

export default function Saved() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      setLoading(true);

      // 1. Get the IDs of saved listings, newest first
      const { data: saves } = await supabase
        .from("saved_listings")
        .select("listing_id, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!saves || saves.length === 0) {
        if (!cancelled) {
          setListings([]);
          setLoading(false);
        }
        return;
      }

      // 2. Fetch the full listings from the discovery feed
      const ids = saves.map((s) => s.listing_id);
      const { data: feed } = await supabase
        .from("discovery_feed")
        .select("*")
        .in("id", ids)
        .eq("is_active", true)
        .eq("is_hidden", false)
        .eq("is_deleted", false);

      // 3. Preserve the "newest save first" order
      const order = new Map(ids.map((id, i) => [id, i]));
      const sorted = (feed || []).sort(
        (a, b) => order.get(a.id) - order.get(b.id),
      );

      if (!cancelled) {
        setListings(sorted);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <div className="max-w-7xl mx-auto">
      <header className="flex items-center gap-3 mb-6">
        <Bookmark size={22} className="text-indigo-400" />
        <h1 className="text-xl font-black text-white">Saved listings</h1>
        {!loading && listings.length > 0 && (
          <span className="text-xs text-slate-500">
            · {listings.length} item{listings.length === 1 ? "" : "s"}
          </span>
        )}
      </header>

      {/* Loading state: Render skeleton while fetching */}
      {loading ? (
        <GridSkeleton count={10} />
      ) : (
        <FeedList
          listings={listings}
          loading={loading}
          type="favorites"
          onListingClick={(item) =>
            navigate(`/listing/${item.id}`, { state: { listing: item } })
          }
        />
      )}
    </div>
  );
}
