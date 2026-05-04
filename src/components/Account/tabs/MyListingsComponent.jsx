import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { useAuth } from "../../../context/AuthContext";
import { GridSkeleton } from "../../UI/Skeleton";
import { getTrustTier } from "../../../utils/trustTier";
import ConfirmModal from "../../UI/ConfirmModal";
import {
  Package,
  AlertTriangle,
  Camera,
  Eye,
  MessageCircle,
  Trash2,
} from "lucide-react";

export default function MyListings({ onCreateListing }) {
  const { user, profile } = useAuth();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [confirm, setConfirm] = useState(null);

  useEffect(() => {
    if (!user) return;
    fetchMyListings();
  }, [user]);

  const fetchMyListings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("discovery_feed")
      .select("*")
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false });
    if (error) console.error("MyListings error:", error.message);
    if (!error && data) setListings(data);
    setLoading(false);
  };

  const getStatus = (listing) => {
    if (listing.is_hidden) return "Hidden";
    if (!listing.is_active && listing.sold_at) return "Sold";
    if (!listing.is_active) return "Removed";
    return "Active";
  };

  const getStatusColor = (listing) => {
    if (listing.is_hidden) return "text-red-400";
    if (!listing.is_active)
      return listing.sold_at ? "text-slate-400" : "text-red-400";
    return "text-emerald-400";
  };

  const deleteListing = (listing) => {
    setConfirm({
      title: "Delete listing?",
      message: `Permanently delete "${listing.title}"? This cannot be undone.`,
      variant: "danger",
      confirmLabel: "Delete",
      onConfirm: () => _doDelete(listing),
    });
  };

  const _doDelete = async (listing) => {
    setActionId(listing.id);
    const { data: images } = await supabase
      .from("listing_images")
      .select("image_url")
      .eq("listing_id", listing.id);

    if (images?.length) {
      const paths = images
        .map((img) => {
          try {
            const url = new URL(img.image_url);
            const marker = "/listing-images/";
            const idx = url.pathname.indexOf(marker);
            if (idx === -1) return null;
            return decodeURIComponent(url.pathname.slice(idx + marker.length));
          } catch {
            return null;
          }
        })
        .filter(Boolean);
      if (paths.length)
        await supabase.storage.from("listing-images").remove(paths);
    }

    const { error } = await supabase
      .from("listings")
      .delete()
      .eq("id", listing.id)
      .eq("seller_id", user.id);

    if (error) alert("Failed: " + error.message);
    else setListings((prev) => prev.filter((l) => l.id !== listing.id));
    setActionId(null);
  };

  const markAsSold = (listing) => {
    setConfirm({
      title: "Mark as sold?",
      message: `Mark "${listing.title}" as sold? This will boost your trust score.`,
      variant: "success",
      confirmLabel: "Mark Sold",
      onConfirm: () => _doMarkSold(listing),
    });
  };

  const _doMarkSold = async (listing) => {
    setActionId(listing.id);
    const { error } = await supabase
      .from("listings")
      .update({ is_active: false, sold_at: new Date().toISOString() })
      .eq("id", listing.id);
    if (error) alert("Failed: " + error.message);
    else {
      await supabase.rpc("increment_trust_on_sale", {
        p_listing_id: listing.id,
      });
      fetchMyListings();
    }
    setActionId(null);
  };

  const getPrice = (l) => {
    if (l.price !== null) return "GH\u20b5 " + l.price;
    if (l.price_min && l.price_max)
      return `GH\u20b5 ${l.price_min} \u2013 ${l.price_max}`;
    return l.price_min ? `From GH\u20b5 ${l.price_min}` : "Ask for price";
  };

  const tier = getTrustTier(profile?.trust_score ?? 50);

  if (loading)
    return (
      <div className="max-w-3xl mx-auto pb-24">
        <GridSkeleton count={6} />
      </div>
    );

  return (
    <div className="max-w-3xl mx-auto pb-24 animate-in fade-in duration-300">
      {confirm && (
        <ConfirmModal {...confirm} onClose={() => setConfirm(null)} />
      )}

      <div className="mb-8">
        <h1 className="text-2xl font-black text-white">My Listings</h1>
        <p className="text-sm text-slate-500 mt-1">
          {listings.length} listings \u00b7 Trust score:{" "}
          <span className={`font-bold ${tier.color}`}>{tier.label}</span>
        </p>
      </div>

      {listings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <Package className="w-12 h-12 mb-4 text-slate-600" />
          <p className="text-white font-bold text-lg">No listings yet</p>
          <button
            onClick={onCreateListing}
            className="mt-6 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold text-sm"
          >
            Create your first listing
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {listings.map((listing) => {
            const imgUrl = listing.image_url || null;
            const busy = actionId === listing.id;
            return (
              <div
                key={listing.id}
                className={`bg-slate-900 border rounded-2xl overflow-hidden flex flex-col transition-all ${
                  listing.is_hidden || (!listing.is_active && !listing.sold_at)
                    ? "border-red-500/30 opacity-70"
                    : listing.is_active
                      ? "border-slate-800"
                      : "border-slate-800/30 opacity-60"
                }`}
              >
                {!listing.is_active && !listing.sold_at && (
                  <div className="w-full px-4 py-2 bg-red-500/10 border-b border-red-500/20 text-red-400 text-[11px] font-bold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    This listing was removed for violating guidelines.
                  </div>
                )}
                {listing.is_hidden && (
                  <div className="w-full px-4 py-2 bg-red-500/10 border-b border-red-500/20 text-red-400 text-[11px] font-bold flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Hidden due to reports.</span>
                    </div>
                    <button
                      onClick={() => alert("Review Flow coming soon.")}
                      className="text-red-300 text-[10px] underline hover:text-red-200"
                    >
                      Review
                    </button>
                  </div>
                )}
                <div className="flex w-full">
                  <div className="w-24 h-24 md:w-28 md:h-28 shrink-0 bg-slate-800 overflow-hidden">
                    {imgUrl ? (
                      <img
                        src={imgUrl}
                        className="w-full h-full object-cover"
                        alt=""
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-700">
                        <Camera className="w-8 h-8" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 p-4 flex flex-col sm:flex-row sm:items-center gap-3 min-w-0">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white text-sm truncate">
                          {listing.title}
                        </span>
                        <span
                          className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-800/50 border border-slate-700/50 ${getStatusColor(listing)}`}
                        >
                          {getStatus(listing)}
                        </span>
                      </div>
                      <p className="text-slate-500 text-xs mt-1">
                        {listing.category_name} \u00b7{" "}
                        <span className="font-bold text-price">
                          {getPrice(listing)}
                        </span>
                      </p>
                      <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          <span className="text-white font-bold">
                            {listing.view_count ?? 0}
                          </span>
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="w-4 h-4" />
                          <span className="text-white font-bold">
                            {listing.contact_count ?? 0}
                          </span>
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {listing.is_active && !listing.is_hidden && (
                        <button
                          onClick={() => markAsSold(listing)}
                          disabled={busy}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all disabled:opacity-50"
                        >
                          {busy ? "\u2026" : "Mark Sold"}
                        </button>
                      )}
                      <button
                        onClick={() => deleteListing(listing)}
                        disabled={busy}
                        className="p-2 bg-slate-800 hover:bg-red-500/10 text-slate-500 hover:text-red-500 rounded-xl transition-all border border-slate-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
