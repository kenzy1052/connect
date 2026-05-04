import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { FeedCard } from "../components/Feed/FeedCard";
import { getTrustTier } from "../utils/trustTier";
import { User, Calendar, Package, ShoppingBag, Star } from "lucide-react";

export default function SellerProfile() {
  const { id } = useParams();
  const [seller, setSeller] = useState(null);
  const [listings, setListings] = useState([]);

  useEffect(() => {
    (async () => {
      const [{ data: s }, { data: ls }] = await Promise.all([
        supabase
          .from("seller_public_profile")
          .select("*")
          .eq("id", id)
          .single(),
        supabase
          .from("discovery_feed")
          .select("*")
          .eq("seller_id", id)
          .eq("is_active", true)
          .eq("is_hidden", false)
          .eq("is_deleted", false)
          .order("created_at", { ascending: false }),
      ]);
      setSeller(s);
      setListings(ls || []);
    })();
  }, [id]);

  if (!seller)
    return (
      <div className="flex items-center justify-center py-24">
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{
            borderColor: "hsl(var(--primary))",
            borderTopColor: "transparent",
          }}
        />
      </div>
    );

  const tier = getTrustTier(seller.trust_score);
  const joined = new Date(seller.joined_at).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 pb-24">
      {/* Profile Card */}
      <div className="premium-card p-6 mb-8">
        <div className="flex items-start gap-5">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-2xl overflow-hidden bg-brand-soft shrink-0 flex items-center justify-center border border-app">
            {seller.avatar_url ? (
              <img
                src={seller.avatar_url}
                className="w-full h-full object-cover"
                alt=""
              />
            ) : (
              <User size={32} className="text-brand" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-black text-main truncate">
              {seller.business_name || seller.full_name}
            </h1>

            {/* Trust badge */}
            <div className="flex items-center gap-1.5 mt-1">
              <Star size={13} className={tier.color} fill="currentColor" />
              <span className={`text-sm font-bold ${tier.color}`}>
                {tier.label}
              </span>
              <span className="text-faint text-xs">
                · {seller.trust_score}/100
              </span>
            </div>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-muted">
              <span className="flex items-center gap-1.5">
                <Calendar size={13} />
                Member since {joined}
              </span>
              <span className="flex items-center gap-1.5">
                <Package size={13} />
                {seller.active_listings ?? 0} active listing
                {seller.active_listings !== 1 ? "s" : ""}
              </span>
              <span className="flex items-center gap-1.5">
                <ShoppingBag size={13} />
                {seller.sold_count ?? 0} sold
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Listings */}
      <div className="flex items-center gap-2 mb-4">
        <Package size={14} className="text-faint" />
        <p className="text-[10px] font-black uppercase tracking-widest text-faint">
          Active listings
        </p>
      </div>

      {listings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center premium-card">
          <Package size={40} className="text-faint mb-3" />
          <p className="text-main font-bold">No active listings</p>
          <p className="text-muted text-sm mt-1">
            This seller hasn't posted anything yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {listings.map((item) => (
            <Link key={item.id} to={`/listing/${item.id}`}>
              <FeedCard item={item} onClick={() => {}} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
