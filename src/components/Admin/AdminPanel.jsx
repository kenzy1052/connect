import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import ListingDetail from "../Feed/ListingDetail";
import AdminFaqTab from "./AdminFaqTab";
import AdminAdsTab from "./AdminAdsTab";
import ConfirmModal from "../UI/ConfirmModal";
import {
  Shield,
  Megaphone,
  Users,
  ClipboardList,
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  Eye,
  EyeOff,
  Trash2,
  UserCheck,
  UserX,
  RefreshCw,
  ArrowLeft,
  BarChart3,
  ShieldCheck,
  ShieldOff,
  RotateCcw,
  X,
  TrendingUp,
  ListChecks,
  History,
  ChevronRight,
} from "lucide-react";

const TABS = [
  { id: "reports", icon: AlertTriangle, label: "Reports" },
  { id: "resolved", icon: History, label: "Resolved" },
  { id: "users", icon: Users, label: "Users" },
  { id: "ads", icon: Megaphone, label: "Ads" },
  { id: "faq", icon: MessageSquare, label: "FAQ" },
  { id: "audit", icon: ClipboardList, label: "Audit" },
];

export default function AdminPanel() {
  const { user } = useAuth();

  const [adminProfile, setAdminProfile] = useState(null);
  const [reports, setReports] = useState([]);
  const [resolvedReports, setResolvedReports] = useState([]);
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [tab, setTab] = useState("reports");
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [selectedListing, setSelectedListing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [userSearch, setUserSearch] = useState("");

  useEffect(() => {
    fetchAll();
    if (user?.id) {
      supabase
        .from("profiles")
        .select(
          "full_name, business_name, email, trust_score, avatar_url, role",
        )
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (data) setAdminProfile(data);
        });
    }
  }, [user?.id]);

  useEffect(() => {
    if (tab === "audit") fetchLogs();
  }, [tab]);

  const fetchAll = async () => {
    setLoading(true);
    const [
      pendingRes,
      resolvedRes,
      usersRes,
      listingsCountRes,
      usersCountRes,
      pendingCountRes,
    ] = await Promise.all([
      supabase
        .from("reports")
        .select(
          `*, listings(id,title,seller_id,is_hidden), reporter:profiles!reporter_id(full_name,business_name,email)`,
        )
        .eq("is_resolved", false)
        .order("created_at", { ascending: false }),
      supabase
        .from("reports")
        .select("*, listings(id,title,seller_id)")
        .eq("is_resolved", true)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("profiles")
        .select("*")
        .order("trust_score", { ascending: true }),
      supabase.from("listings").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase
        .from("reports")
        .select("*", { count: "exact", head: true })
        .eq("is_resolved", false),
    ]);

    const grouped = Object.values(
      pendingRes.data?.reduce((acc, r) => {
        const key = r.listing_id;
        if (!acc[key]) acc[key] = { listing: r.listings, reports: [] };
        acc[key].reports.push(r);
        return acc;
      }, {}) || {},
    );

    setReports(grouped);
    setResolvedReports(resolvedRes.data || []);
    if (usersRes.data) setUsers(usersRes.data);
    setStats({
      listings: listingsCountRes.count ?? 0,
      users: usersCountRes.count ?? 0,
      pending: pendingCountRes.count ?? 0,
    });
    setLoading(false);
  };

  const fetchLogs = async () => {
    const { data } = await supabase
      .from("admin_audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    setLogs(data || []);
  };

  const logAdminAction = async (action, targetType, targetId) => {
    await supabase
      .from("admin_audit_logs")
      .insert({
        admin_id: user?.id ?? null,
        action,
        target_type: targetType,
        target_id: targetId,
      });
  };

  const dismissReport = async (report) => {
    setActionId(report.id);
    const { error } = await supabase.rpc("admin_dismiss_report", {
      p_report_id: report.id,
    });
    if (error) {
      alert(error.message);
      setActionId(null);
      return;
    }
    await fetchAll();
    setActionId(null);
  };

  const dismissAllReports = (listingId) => {
    setConfirm({
      title: "Dismiss all reports?",
      message:
        "All pending reports for this listing will be marked as dismissed.",
      variant: "warning",
      confirmLabel: "Dismiss All",
      onConfirm: () => _doDismissReports(listingId),
    });
  };

  const _doDismissReports = async (listingId) => {
    setActionId(listingId);
    const { error } = await supabase.rpc("admin_dismiss_reports_for_listing", {
      p_listing_id: listingId,
    });
    if (error) alert(error.message);
    else await logAdminAction("DISMISS_REPORTS", "listing", listingId);
    await fetchAll();
    setActionId(null);
  };

  const handleViewListing = async (listingId) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("listings")
      .select(
        `*, seller_profile:profiles!seller_id(full_name,business_name,trust_score), category:categories(name)`,
      )
      .eq("id", listingId)
      .single();
    if (error || !data) {
      alert("Listing not found or already deleted.");
    } else {
      setSelectedListing({
        ...data,
        listing_type: data.type,
        seller_name:
          data.seller_profile?.business_name || data.seller_profile?.full_name,
        seller_trust: data.seller_profile?.trust_score,
        trust_score: data.seller_profile?.trust_score,
        category_name: data.category?.name,
      });
    }
    setLoading(false);
  };

  const handleDeleteListing = (listingId) => {
    setConfirm({
      title: "Permanently delete this listing?",
      message:
        "This action cannot be undone. The listing and all its data will be permanently removed.",
      variant: "danger",
      confirmLabel: "Delete Permanently",
      onConfirm: () => _doDeleteListing(listingId),
    });
  };

  const _doDeleteListing = async (listingId) => {
    setActionId(listingId);
    const { error } = await supabase.rpc("admin_delete_listing", {
      p_listing_id: listingId,
    });
    if (error) alert(error.message);
    await fetchAll();
    setActionId(null);
  };

  const toggleHide = async (listingId, hidden) => {
    setActionId(listingId);
    const { error } = await supabase.rpc("admin_set_listing_visibility", {
      p_listing_id: listingId,
      p_hidden: hidden,
    });
    if (error) {
      alert(error.message);
    } else {
      await logAdminAction(
        hidden ? "HIDE_LISTING" : "UNHIDE_LISTING",
        "listing",
        listingId,
      );
    }
    await fetchAll();
    setActionId(null);
  };

  const confirmListingPenalty = (listingId) => {
    setConfirm({
      title: "Confirm & penalize seller?",
      message:
        "All reports will be confirmed and the seller's trust score will be reduced.",
      variant: "danger",
      confirmLabel: "Confirm & Penalize",
      onConfirm: () => _doConfirmPenalty(listingId),
    });
  };

  const _doConfirmPenalty = async (listingId) => {
    setActionId(listingId);
    const { error } = await supabase.rpc("admin_confirm_listing_reports", {
      p_listing_id: listingId,
    });
    if (error) {
      alert(error.message);
      setActionId(null);
      return;
    }
    await fetchAll();
    setActionId(null);
  };

  const resetTrust = (userId, name) => {
    setConfirm({
      title: "Reset trust score?",
      message: `Reset ${name}'s trust score to 25? This will affect their listing visibility.`,
      variant: "warning",
      confirmLabel: "Reset to 25",
      onConfirm: () => _doResetTrust(userId),
    });
  };

  const _doResetTrust = async (userId) => {
    const { error } = await supabase.rpc("admin_reset_trust", {
      p_user_id: userId,
    });
    if (error) {
      alert(error.message);
      return;
    }
    await fetchAll();
  };

  const toggleRole = (u) => {
    const newRole = u.role === "admin" ? "student" : "admin";
    setConfirm({
      title:
        newRole === "admin" ? "Grant Admin Access?" : "Revoke Admin Access?",
      message:
        newRole === "admin"
          ? `Give ${u.business_name || u.full_name} full admin privileges? They can moderate content, manage users and ads.`
          : `Remove admin privileges from ${u.business_name || u.full_name}? They will become a regular user.`,
      variant: newRole === "admin" ? "warning" : "danger",
      confirmLabel: newRole === "admin" ? "Grant Admin" : "Revoke Admin",
      onConfirm: () => _doToggleRole(u.id, newRole),
    });
  };

  const _doToggleRole = async (userId, newRole) => {
    if (userId === user?.id) {
      alert("You cannot change your own role.");
      return;
    }
    // Use RPC so it works even with RLS on profiles table
    const { error } = await supabase.rpc("admin_set_user_role", {
      p_user_id: userId,
      p_role: newRole,
    });
    if (error) {
      // Fallback: try direct update if RPC doesn't exist yet
      const { error: updateErr } = await supabase
        .from("profiles")
        .update({ role: newRole })
        .eq("id", userId);
      if (updateErr) {
        alert(
          "Failed: " +
            updateErr.message +
            "\n\nRun the migration SQL in supabase/migrations/ to add the admin_set_user_role() function.",
        );
        return;
      }
    }
    await logAdminAction(
      newRole === "admin" ? "GRANT_ADMIN" : "REVOKE_ADMIN",
      "user",
      userId,
    );
    await fetchAll();
  };

  const toggleSuspension = async (u) => {
    const { error } = await supabase.rpc("admin_toggle_suspension", {
      p_user_id: u.id,
    });
    if (error) {
      alert(error.message);
      return;
    }
    await fetchAll();
  };

  // ── LISTING INSPECTOR ──────────────────────────────────────────────────────
  if (selectedListing)
    return (
      <div className="pt-4 max-w-5xl mx-auto animate-in fade-in duration-300">
        <div className="mb-4 flex justify-between items-center bg-surface border border-app rounded-2xl px-5 py-3">
          <div className="flex items-center gap-2">
            <Shield size={14} className="text-indigo-400" />
            <span className="text-faint font-bold uppercase tracking-wider text-[10px]">
              Admin Inspector
            </span>
          </div>
          <button
            onClick={() => setSelectedListing(null)}
            className="flex items-center gap-1.5 px-4 py-2 bg-surface-2 hover:bg-surface-3 text-main text-[11px] font-bold rounded-xl border border-app transition-all"
          >
            <ArrowLeft size={13} /> Back to Panel
          </button>
        </div>
        <ListingDetail
          listing={selectedListing}
          onBack={() => setSelectedListing(null)}
        />
      </div>
    );

  if (loading)
    return (
      <div className="flex justify-center py-32">
        <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );

  const pendingCount = reports.length;
  const tabsWithBadge = TABS.map((t) => ({
    ...t,
    badge: t.id === "reports" ? pendingCount : null,
  }));

  const filteredUsers = users.filter((u) => {
    const q = userSearch.toLowerCase();
    if (!q) return true;
    return (
      (u.full_name || "").toLowerCase().includes(q) ||
      (u.business_name || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q)
    );
  });

  return (
    <div
      className="max-w-6xl mx-auto animate-in fade-in duration-300"
      style={{ paddingBottom: "6rem" }}
    >
      {confirm && (
        <ConfirmModal {...confirm} onClose={() => setConfirm(null)} />
      )}

      {/* ── TOP HEADER ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Shield size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-main tracking-tight">
              Admin Panel
            </h1>
            <p className="text-xs text-faint mt-0.5 font-medium">
              Moderate · Manage · Monitor
            </p>
          </div>
        </div>
        {adminProfile && (
          <div className="flex items-center gap-3 bg-surface border border-indigo-500/25 rounded-2xl px-4 py-2.5 shrink-0 shadow-sm">
            <div className="w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white font-black text-sm shrink-0 shadow-md">
              {adminProfile.avatar_url ? (
                <img
                  src={adminProfile.avatar_url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                (adminProfile.business_name ||
                  adminProfile.full_name ||
                  "A")[0].toUpperCase()
              )}
            </div>
            <div className="min-w-0">
              <p className="text-main font-bold text-sm truncate">
                {adminProfile.business_name || adminProfile.full_name}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <ShieldCheck size={10} className="text-indigo-400" />
                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                  Admin
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── STATS ROW ──────────────────────────────────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            {
              label: "Total Listings",
              value: stats.listings,
              icon: ListChecks,
              color: "text-indigo-400",
              bg: "bg-indigo-500/10",
              border: "border-indigo-500/20",
              glow: "shadow-indigo-500/10",
            },
            {
              label: "Total Users",
              value: stats.users,
              icon: Users,
              color: "text-emerald-400",
              bg: "bg-emerald-500/10",
              border: "border-emerald-500/20",
              glow: "shadow-emerald-500/10",
            },
            {
              label: "Pending Reports",
              value: stats.pending,
              icon: AlertTriangle,
              color: stats.pending > 0 ? "text-red-400" : "text-slate-400",
              bg: stats.pending > 0 ? "bg-red-500/10" : "bg-slate-500/10",
              border:
                stats.pending > 0 ? "border-red-500/20" : "border-slate-500/20",
              glow: stats.pending > 0 ? "shadow-red-500/10" : "",
            },
            {
              label: "Resolved",
              value: resolvedReports.length,
              icon: CheckCircle2,
              color: "text-slate-400",
              bg: "bg-slate-500/10",
              border: "border-slate-500/20",
              glow: "",
            },
          ].map((s) => (
            <div
              key={s.label}
              className={`bg-surface border ${s.border} rounded-2xl p-4 flex items-center gap-3 shadow-lg ${s.glow}`}
            >
              <div
                className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}
              >
                <s.icon size={18} className={s.color} />
              </div>
              <div>
                <div className={`text-2xl font-black ${s.color}`}>
                  {s.value}
                </div>
                <div className="text-[10px] text-faint uppercase tracking-wide font-bold leading-tight mt-0.5">
                  {s.label}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── LAYOUT: Sidebar + Content ───────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row gap-5" style={{ minHeight: 0 }}>
        {/* Sidebar tabs — desktop: sticky, does NOT scroll with content */}
        <div className="hidden md:flex flex-col gap-1 w-56 shrink-0 self-start sticky top-4">
          {/* Sidebar card */}
          <div className="bg-surface border border-app rounded-2xl overflow-hidden shadow-sm">
            <div className="px-4 pt-4 pb-3 border-b border-app">
              <p className="text-[10px] font-black uppercase tracking-widest text-faint">
                Navigation
              </p>
            </div>
            <div className="p-2 flex flex-col gap-0.5">
              {tabsWithBadge.map((t) => {
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all text-left group ${
                      active
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30"
                        : "text-muted hover:text-main hover:bg-surface-2"
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                        active
                          ? "bg-white/20"
                          : "bg-surface-2 group-hover:bg-surface-3"
                      }`}
                    >
                      <t.icon
                        size={14}
                        className={
                          active
                            ? "text-white"
                            : "text-faint group-hover:text-main"
                        }
                      />
                    </div>
                    <span className="flex-1 text-[13px]">{t.label}</span>
                    {t.badge ? (
                      <span
                        className={`text-[10px] font-black min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1 ${
                          active
                            ? "bg-white/25 text-white"
                            : "bg-red-500 text-white"
                        }`}
                      >
                        {t.badge}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
            <div className="p-2 border-t border-app">
              <button
                onClick={fetchAll}
                className="flex items-center gap-2.5 px-3 py-2.5 w-full rounded-xl text-xs font-bold text-faint hover:text-main hover:bg-surface-2 transition-all group"
              >
                <div className="w-7 h-7 rounded-lg bg-surface-2 group-hover:bg-surface-3 flex items-center justify-center shrink-0 transition-colors">
                  <RefreshCw
                    size={13}
                    className="group-hover:rotate-180 transition-transform duration-500"
                  />
                </div>
                Refresh Data
              </button>
            </div>
          </div>
        </div>

        {/* Mobile horizontal tabs */}
        <div className="md:hidden flex items-center gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
          {tabsWithBadge.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                  active
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/25"
                    : "bg-surface border border-app text-muted"
                }`}
              >
                <t.icon size={13} />
                {t.label}
                {t.badge ? (
                  <span
                    className={`text-[10px] font-black px-1.5 rounded-full ${active ? "bg-white/20" : "bg-red-500 text-white"}`}
                  >
                    {t.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {/* ── CONTENT AREA ──────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          {/* PENDING REPORTS */}
          {tab === "reports" && (
            <div className="space-y-4">
              {reports.length === 0 ? (
                <Empty
                  icon={<CheckCircle2 size={40} />}
                  title="No pending reports"
                  sub="You're all caught up!"
                />
              ) : (
                reports.map((group) => {
                  const listing = group.listing;
                  const reportList = group.reports.filter(
                    (r) => !r.is_resolved,
                  );
                  if (reportList.length === 0) return null;
                  const busy = actionId === listing?.id;
                  return (
                    <div
                      key={listing?.id || Math.random()}
                      className="bg-surface border border-app rounded-2xl overflow-hidden"
                    >
                      {/* Report header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-app bg-red-500/5">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="flex items-center gap-1.5 text-[10px] font-black uppercase text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded-lg">
                              <AlertTriangle size={10} /> {reportList.length}{" "}
                              report{reportList.length !== 1 ? "s" : ""}
                            </span>
                            {listing?.is_hidden && (
                              <span className="text-[9px] font-black uppercase px-2 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                Hidden
                              </span>
                            )}
                          </div>
                          <p className="font-bold text-main text-base mt-1.5">
                            "{listing?.title || "Deleted listing"}"
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2 shrink-0">
                          {listing?.id && (
                            <ActionBtn
                              onClick={() => handleViewListing(listing.id)}
                              variant="indigo"
                              icon={Eye}
                              label="Inspect"
                              disabled={busy}
                            />
                          )}
                          {listing?.id &&
                            (listing.is_hidden ? (
                              <ActionBtn
                                onClick={() => toggleHide(listing.id, false)}
                                variant="green"
                                icon={Eye}
                                label="Unhide"
                                disabled={busy}
                              />
                            ) : (
                              <ActionBtn
                                onClick={() => toggleHide(listing.id, true)}
                                variant="amber"
                                icon={EyeOff}
                                label="Hide"
                                disabled={busy}
                              />
                            ))}
                          <ActionBtn
                            onClick={() => dismissAllReports(listing.id)}
                            variant="ghost"
                            label="Dismiss All"
                            disabled={busy}
                          />
                          <ActionBtn
                            onClick={() => confirmListingPenalty(listing.id)}
                            variant="orange"
                            label="−10 Trust"
                            disabled={busy}
                          />
                          <ActionBtn
                            onClick={() => handleDeleteListing(listing.id)}
                            variant="red"
                            icon={Trash2}
                            label="Delete"
                            disabled={busy}
                          />
                        </div>
                      </div>

                      {/* Individual reports */}
                      <div className="divide-y divide-app">
                        {reportList.map((r) => (
                          <div
                            key={r.id}
                            className="flex items-center justify-between px-5 py-3 gap-3"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-muted italic truncate">
                                "{r.reason}"
                              </p>
                              <p className="text-[11px] text-faint mt-0.5">
                                {r.reporter?.business_name ||
                                  r.reporter?.full_name ||
                                  "Unknown"}{" "}
                                · {r.reporter?.email}
                              </p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="text-[10px] text-faint">
                                {new Date(r.created_at).toLocaleDateString(
                                  "en-GB",
                                  { day: "numeric", month: "short" },
                                )}
                              </span>
                              <button
                                onClick={() => dismissReport(r)}
                                disabled={actionId === r.id}
                                className="px-3 py-1.5 bg-surface-2 hover:bg-surface-3 text-muted text-[10px] font-black uppercase rounded-lg border border-app transition-all disabled:opacity-40"
                              >
                                {actionId === r.id ? "..." : "Dismiss"}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* RESOLVED */}
          {tab === "resolved" && (
            <div className="space-y-2">
              {resolvedReports.length === 0 ? (
                <Empty
                  icon={<History size={40} />}
                  title="No resolved reports"
                  sub="Nothing here yet."
                />
              ) : (
                resolvedReports.map((r) => (
                  <div
                    key={r.id}
                    className="bg-surface border border-app rounded-xl px-5 py-3.5 flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-main font-bold truncate">
                        "{r.listings?.title || "Deleted listing"}"
                      </p>
                      <p className="text-xs text-faint italic mt-0.5 truncate">
                        "{r.reason}"
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-faint">
                        {new Date(r.created_at).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                      <ResolutionBadge action={r.resolution_action} />
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* USERS */}
          {tab === "users" && (
            <div className="space-y-3">
              <input
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search users by name or email…"
                className="w-full bg-surface border border-app rounded-xl px-4 py-3 text-sm text-main placeholder-faint focus:outline-none focus:border-indigo-500/60 transition-colors mb-1"
              />
              {filteredUsers.length === 0 ? (
                <Empty
                  icon={<Users size={40} />}
                  title="No users found"
                  sub="Try a different search."
                />
              ) : (
                filteredUsers.map((u) => {
                  const name = u.business_name || u.full_name || "Unknown";
                  const trust = u.trust_score ?? 50;
                  const trustColor =
                    trust >= 70
                      ? "text-emerald-400"
                      : trust >= 40
                        ? "text-indigo-400"
                        : "text-red-400";
                  const barColor =
                    trust >= 70
                      ? "bg-emerald-400"
                      : trust >= 40
                        ? "bg-indigo-400"
                        : "bg-red-400";
                  return (
                    <div
                      key={u.id}
                      className="bg-surface border border-app rounded-2xl p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-600/20 border border-indigo-500/20 flex items-center justify-center text-indigo-300 font-black text-sm shrink-0">
                          {name[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-main text-sm">
                              {name}
                            </p>
                            {u.role === "admin" && (
                              <span className="flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                <ShieldCheck size={9} /> Admin
                              </span>
                            )}
                            {u.is_suspended && (
                              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                                Suspended
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-faint mt-0.5 truncate">
                            {u.email}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <span
                              className={`text-xs font-black ${trustColor}`}
                            >
                              ★ {trust}
                            </span>
                            <div className="flex-1 max-w-24 h-1.5 bg-surface-2 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${barColor}`}
                                style={{ width: `${trust}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-app">
                        <button
                          onClick={() => toggleRole(u)}
                          className={`flex items-center gap-1.5 px-3 py-2 text-[10px] font-black uppercase rounded-lg border transition-all ${
                            u.role === "admin"
                              ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20"
                              : "bg-surface-2 text-faint border-app hover:bg-indigo-500/10 hover:text-indigo-400 hover:border-indigo-500/20"
                          }`}
                        >
                          {u.role === "admin" ? (
                            <>
                              <ShieldOff size={11} /> Revoke Admin
                            </>
                          ) : (
                            <>
                              <ShieldCheck size={11} /> Make Admin
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => resetTrust(u.id, name)}
                          className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-black uppercase bg-surface-2 hover:bg-amber-500/10 text-faint hover:text-amber-400 rounded-lg border border-app hover:border-amber-500/20 transition-all"
                        >
                          <RotateCcw size={11} /> Reset Trust
                        </button>
                        <button
                          onClick={() => toggleSuspension(u)}
                          className={`flex items-center gap-1.5 px-3 py-2 text-[10px] font-black uppercase rounded-lg border transition-all ml-auto ${
                            u.is_suspended
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                              : "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20"
                          }`}
                        >
                          {u.is_suspended ? (
                            <>
                              <UserCheck size={11} /> Unsuspend
                            </>
                          ) : (
                            <>
                              <UserX size={11} /> Suspend
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ADS */}
          {tab === "ads" && <AdminAdsTab />}

          {/* FAQ */}
          {tab === "faq" && <AdminFaqTab />}

          {/* AUDIT */}
          {tab === "audit" && (
            <div className="space-y-2">
              {logs.length === 0 ? (
                <Empty
                  icon={<ClipboardList size={40} />}
                  title="No audit logs yet"
                  sub="Actions will be recorded here."
                />
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className="bg-surface border border-app rounded-xl px-5 py-3.5 flex items-center justify-between gap-4"
                  >
                    <div>
                      <p className="text-sm text-main font-bold">
                        {log.action.replaceAll("_", " ")}
                      </p>
                      <p className="text-[11px] text-faint font-mono mt-0.5">
                        {log.target_type} · {log.target_id?.slice(0, 12)}…
                      </p>
                    </div>
                    <p className="text-[10px] text-faint font-black uppercase shrink-0">
                      {new Date(log.created_at).toLocaleString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        day: "2-digit",
                        month: "short",
                      })}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
        {/* end content */}
      </div>
      {/* end layout */}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ActionBtn({ onClick, variant, icon: Icon, label, disabled }) {
  const styles = {
    indigo: "bg-indigo-600 hover:bg-indigo-500 text-white",
    green:
      "bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 border border-emerald-500/30",
    amber:
      "bg-amber-600/20 hover:bg-amber-600/40 text-amber-400 border border-amber-500/30",
    orange: "bg-orange-600 hover:bg-orange-500 text-white",
    red: "bg-red-600 hover:bg-red-500 text-white",
    ghost: "bg-surface border border-app text-muted hover:text-main",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1.5 px-3 py-2 text-[10px] font-black uppercase rounded-xl transition-all disabled:opacity-40 ${styles[variant]}`}
    >
      {Icon && <Icon size={12} />}
      {disabled ? "…" : label}
    </button>
  );
}

function ResolutionBadge({ action }) {
  const map = {
    confirmed: {
      label: "Penalty Applied",
      cls: "text-red-400 border-red-500/30 bg-red-500/10",
    },
    dismissed: {
      label: "Dismissed",
      cls: "text-faint border-app bg-surface-2",
    },
    deleted: {
      label: "Listing Removed",
      cls: "text-red-500 border-red-500/40 bg-red-500/10",
    },
  };
  const m = map[action] || {
    label: "Resolved",
    cls: "text-faint border-app bg-surface-2",
  };
  return (
    <span
      className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg border ${m.cls}`}
    >
      {m.label}
    </span>
  );
}

function Empty({ icon, title, sub }) {
  return (
    <div className="text-center py-16 flex flex-col items-center gap-3">
      <div className="text-faint">{icon}</div>
      <p className="font-bold text-main">{title}</p>
      <p className="text-sm text-faint">{sub}</p>
    </div>
  );
}
