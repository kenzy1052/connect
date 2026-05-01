import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Eye,
  MessageCircle,
  Package,
  Bookmark,
  TrendingUp,
  PlusCircle,
  Settings as SettingsIcon,
  ListChecks,
  ShoppingBag,
} from "lucide-react";
import { supabase } from "../../../lib/supabaseClient";
import { useAuth } from "../../../context/AuthContext";
import { getTrustTier } from "../../../utils/trustTier";

function StatCard({ icon: Icon, label, value, sub, accent = "indigo" }) {
  const ring = {
    indigo: "border-indigo-500/30 bg-indigo-500/5",
    emerald: "border-emerald-500/30 bg-emerald-500/5",
    amber: "border-amber-500/30 bg-amber-500/5",
    rose: "border-rose-500/30 bg-rose-500/5",
  }[accent];

  return (
    <div className={`rounded-2xl border ${ring} p-5`}>
      <div className="flex items-center gap-2 text-slate-400">
        <Icon size={14} />
        <span className="text-[10px] font-black uppercase tracking-widest">
          {label}
        </span>
      </div>
      <p className="text-3xl font-black text-white mt-2">{value}</p>
      {sub && <p className="text-[11px] text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

function ActionTile({ to, icon: Icon, title, sub }) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/40 rounded-2xl p-4 transition-all"
    >
      <div className="w-10 h-10 rounded-xl bg-slate-800 group-hover:bg-indigo-500/20 flex items-center justify-center text-slate-300 group-hover:text-indigo-400 transition-colors">
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-bold text-white truncate">{title}</p>
        <p className="text-[11px] text-slate-500 truncate">{sub}</p>
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    active: 0,
    views: 0,
    contacts: 0,
    sold: 0,
    saved: 0,
    viewsLast7: 0,
    contactsLast7: 0,
  });

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      setLoading(true);

      const sevenDaysAgo = new Date(
        Date.now() - 7 * 24 * 60 * 60 * 1000,
      ).toISOString();

      // Fire all the counts in parallel — much faster on the Supabase free plan
      const [
        { count: active },
        { count: sold },
        { count: saved },
        { data: feedRows },
        { data: recentEng },
      ] = await Promise.all([
        supabase
          .from("listings")
          .select("id", { count: "exact", head: true })
          .eq("seller_id", user.id)
          .eq("is_active", true)
          .eq("is_deleted", false)
          .is("sold_at", null),

        supabase
          .from("listings")
          .select("id", { count: "exact", head: true })
          .eq("seller_id", user.id)
          .not("sold_at", "is", null),

        supabase
          .from("saved_listings")
          .select("listing_id", { count: "exact", head: true })
          .eq("user_id", user.id),

        supabase
          .from("discovery_feed")
          .select("view_count, contact_count")
          .eq("seller_id", user.id),

        supabase
          .from("listing_engagements")
          .select("type, listing_id, created_at, listings!inner(seller_id)")
          .eq("listings.seller_id", user.id)
          .gte("created_at", sevenDaysAgo),
      ]);

      if (cancelled) return;

      const views = (feedRows || []).reduce(
        (s, r) => s + (r.view_count || 0),
        0,
      );
      const contacts = (feedRows || []).reduce(
        (s, r) => s + (r.contact_count || 0),
        0,
      );
      const viewsLast7 = (recentEng || []).filter(
        (r) => r.type === "view",
      ).length;
      const contactsLast7 = (recentEng || []).filter(
        (r) => r.type === "contact",
      ).length;

      setStats({
        active: active || 0,
        sold: sold || 0,
        saved: saved || 0,
        views,
        contacts,
        viewsLast7,
        contactsLast7,
      });
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const trust = profile?.trust_score ?? 50;
  const tier = getTrustTier(trust);
  const name = profile?.business_name || profile?.full_name || "there";

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Greeting + trust */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-slate-500">
            Dashboard
          </p>
          <h1 className="text-2xl font-black text-white mt-1">
            Welcome back, {name.split(" ")[0]}
          </h1>
        </div>
        <Link
          to="/profile"
          className={`flex items-center gap-3 bg-slate-900 border border-slate-800 hover:border-indigo-500/40 rounded-2xl px-4 py-3 transition-all`}
        >
          <span className="text-yellow-400 text-base">★</span>
          <div className="leading-tight">
            <p className={`text-sm font-black ${tier.color}`}>
              {tier.label} seller
            </p>
            <p className="text-[11px] text-slate-500">
              Trust {trust}/100 · tap to view profile
            </p>
          </div>
        </Link>
      </header>

      {/* All-time stats */}
      <section>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">
          Your shop
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            icon={ListChecks}
            label="Active listings"
            value={loading ? "–" : stats.active}
            sub="Live in the feed"
            accent="indigo"
          />
          <StatCard
            icon={Eye}
            label="Total views"
            value={loading ? "–" : stats.views.toLocaleString()}
            sub={`+${stats.viewsLast7} in last 7 days`}
            accent="emerald"
          />
          <StatCard
            icon={MessageCircle}
            label="Times contacted"
            value={loading ? "–" : stats.contacts.toLocaleString()}
            sub={`+${stats.contactsLast7} in last 7 days`}
            accent="amber"
          />
          <StatCard
            icon={Package}
            label="Items sold"
            value={loading ? "–" : stats.sold}
            sub="All-time confirmed sales"
            accent="rose"
          />
        </div>
      </section>

      {/* Engagement summary banner */}
      {!loading && stats.active > 0 && stats.viewsLast7 === 0 && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5">
          <p className="text-sm font-bold text-amber-300">
            Your listings haven't been seen this week
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Try posting a new listing or sharing yours with friends. Fresher
            listings get a temporary visibility boost.
          </p>
        </div>
      )}

      {!loading && stats.viewsLast7 > 0 && stats.contactsLast7 === 0 && (
        <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/5 p-5">
          <p className="text-sm font-bold text-indigo-300">
            People are looking, but not contacting yet
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Consider lowering the price or adding clearer photos and a sharper
            description. Buyers reach out when they trust what they see.
          </p>
        </div>
      )}

      {/* Quick actions */}
      <section>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">
          Quick actions
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <ActionTile
            to="/create"
            icon={PlusCircle}
            title="Post a listing"
            sub="Sell something new"
          />
          <ActionTile
            to="/mylistings"
            icon={ShoppingBag}
            title="My listings"
            sub={`${stats.active} active${stats.sold ? ` · ${stats.sold} sold` : ""}`}
          />
          <ActionTile
            to="/saved"
            icon={Bookmark}
            title="Saved"
            sub={`${stats.saved} item${stats.saved === 1 ? "" : "s"}`}
          />
          <ActionTile
            to="/profile"
            icon={SettingsIcon}
            title="Profile & contacts"
            sub="Edit your account info"
          />
        </div>
      </section>

      {/* Tip */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 flex items-start gap-3">
        <TrendingUp size={18} className="text-indigo-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-bold text-white">How visibility works</p>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Listings rank by a mix of your trust score and how recently they
            were posted. Fresh listings get a 24-hour boost; trust grows from
            real, repeated sales over time. Treat each buyer well — that's still
            the fastest path to the top of the feed.
          </p>
        </div>
      </section>
    </div>
  );
}
