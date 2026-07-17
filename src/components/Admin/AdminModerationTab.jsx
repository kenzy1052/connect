import { useState, useEffect, useCallback } from "react";
import {
  ListChecks,
  Check,
  X,
  Clock,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";

function StatusBadge({ status }) {
  const map = {
    pending: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    approved: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    rejected: "bg-red-500/15 text-red-400 border-red-500/30",
  };
  return (
    <span
      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm border ${map[status] || ""}`}
    >
      {status}
    </span>
  );
}

export default function AdminModerationTab() {
  const { user } = useAuth();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [busyId, setBusyId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [reason, setReason] = useState("");

  const fetchListings = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("listings")
      .select(
        `id, title, price, price_min, price_max, type, created_at, moderation_status,
         moderation_reason, seller_id,
         seller:profiles!seller_id(full_name, business_name, trust_score),
         category:categories(name)`,
      )
      .order("created_at", { ascending: false })
      .limit(100);

    if (filter !== "all") query = query.eq("moderation_status", filter);

    const { data, error } = await query;
    if (!error && data) setListings(data);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const logAction = async (action, targetId, metadata) => {
    await supabase.from("admin_audit_logs").insert({
      admin_id: user?.id ?? null,
      action,
      target_type: "listing",
      target_id: targetId,
      metadata: metadata || null,
    });
  };

  const approve = async (listing) => {
    setBusyId(listing.id);
    const { error } = await supabase.rpc("admin_moderate_listing", {
      p_listing_id: listing.id,
      p_status: "approved",
      p_reason: null,
    });
    if (!error) {
      await logAction("listing_approved", listing.id, { title: listing.title });
      setListings((prev) => prev.filter((l) => l.id !== listing.id || filter === "all"));
      fetchListings();
    }
    setBusyId(null);
  };

  const reject = async (listing) => {
    setBusyId(listing.id);
    const { error } = await supabase.rpc("admin_moderate_listing", {
      p_listing_id: listing.id,
      p_status: "rejected",
      p_reason: reason || "Rejected by admin",
    });
    if (!error) {
      await logAction("listing_rejected", listing.id, {
        title: listing.title,
        reason: reason || "Rejected by admin",
      });
      setListings((prev) => prev.filter((l) => l.id !== listing.id || filter === "all"));
      fetchListings();
    }
    setBusyId(null);
    setRejectingId(null);
    setReason("");
  };

  const priceLabel = (l) => {
    if (l.price) return `GH₵ ${Number(l.price).toLocaleString()}`;
    if (l.price_min && l.price_max) return `GH₵ ${l.price_min}–${l.price_max}`;
    return "Contact for price";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {["pending", "approved", "rejected", "all"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={
              "px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-all " +
              (filter === f
                ? "bg-brand text-[hsl(var(--primary-fg))]"
                : "bg-surface-2 text-muted hover:text-main")
            }
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-xs text-faint">Loading listings…</p>
      ) : listings.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 text-center py-16">
          <ListChecks size={32} className="text-faint" />
          <p className="text-sm text-muted">
            {filter === "pending" ? "Nothing waiting for review" : "No listings here"}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {listings.map((l) => (
            <div
              key={l.id}
              className="bg-surface border border-app rounded-xl p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-main truncate">
                      {l.title}
                    </p>
                    <StatusBadge status={l.moderation_status} />
                  </div>
                  <p className="text-xs text-faint mt-0.5">
                    {l.category?.name || "Uncategorized"} · {priceLabel(l)}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <ShieldCheck size={11} className="text-faint" />
                    <p className="text-[11px] text-faint">
                      {l.seller?.business_name || l.seller?.full_name || "Unknown seller"}
                      {" · trust "}
                      {l.seller?.trust_score ?? "—"}
                    </p>
                  </div>
                  {l.moderation_reason && (
                    <p className="text-[11px] text-faint mt-1 italic">
                      "{l.moderation_reason}"
                    </p>
                  )}
                </div>
                <a
                  href={`/listing/${l.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 w-8 h-8 rounded-full bg-surface-2 hover:bg-surface-3 grid place-items-center text-muted hover:text-main transition-all"
                  title="View listing"
                >
                  <ExternalLink size={13} />
                </a>
              </div>

              {l.moderation_status === "pending" && (
                <>
                  {rejectingId === l.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        autoFocus
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Reason for rejection (shown in your audit log)"
                        className="flex-1 bg-app border border-app rounded-md px-3 py-2 text-xs text-main outline-none focus:border-[hsl(var(--primary))]"
                      />
                      <button
                        onClick={() => reject(l)}
                        disabled={busyId === l.id}
                        className="px-3 py-2 rounded-md bg-red-500/15 text-red-400 text-xs font-semibold hover:bg-red-500/25 transition-all disabled:opacity-50"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => {
                          setRejectingId(null);
                          setReason("");
                        }}
                        className="px-3 py-2 rounded-md bg-surface-2 text-muted text-xs font-semibold hover:text-main transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => approve(l)}
                        disabled={busyId === l.id}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md bg-emerald-500/15 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/25 transition-all disabled:opacity-50"
                      >
                        <Check size={13} /> Approve
                      </button>
                      <button
                        onClick={() => setRejectingId(l.id)}
                        disabled={busyId === l.id}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md bg-red-500/15 text-red-400 text-xs font-semibold hover:bg-red-500/25 transition-all disabled:opacity-50"
                      >
                        <X size={13} /> Reject
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
