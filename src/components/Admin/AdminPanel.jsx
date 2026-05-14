import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import ListingDetail from "../Feed/ListingDetail";
import AdminFaqTab from "./AdminFaqTab";
import AdminAdsTab from "./AdminAdsTab";
import AdminReportsPage from "./Reports/AdminReportsPage";
import ConfirmModal from "../UI/ConfirmModal";
import {
  Shield,
  Megaphone,
  Users,
  ClipboardList,
  MessageSquare,
  CheckCircle2,
  Users as UsersIcon,
  RefreshCw,
  ArrowLeft,
  ListChecks,
  Flag,
} from "lucide-react";

const TABS = [
  { id: "users", icon: Users, label: "Users" },
  { id: "reports", icon: Flag, label: "Reports" },
  { id: "ads", icon: Megaphone, label: "Ads" },
  { id: "faq", icon: MessageSquare, label: "FAQ" },
  { id: "audit", icon: ClipboardList, label: "Audit" },
];

export default function AdminPanel() {
  const { user } = useAuth();

  const [adminProfile, setAdminProfile] = useState(null);
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [tab, setTab] = useState("users");
  const [loading, setLoading] = useState(true);
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
    const [usersRes, listingsCountRes, usersCountRes, reportsCountRes] =
      await Promise.all([
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

    if (usersRes.data) setUsers(usersRes.data);
    setStats({
      listings: listingsCountRes.count ?? 0,
      users: usersCountRes.count ?? 0,
      reports: reportsCountRes.count ?? 0,
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
    await supabase.from("admin_audit_logs").insert({
      admin_id: user?.id ?? null,
      action,
      target_type: targetType,
      target_id: targetId,
    });
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
          : `Remove admin privileges from ${u.business_name || u.full_name}? They will no longer be able to access the admin panel.`,
      variant: newRole === "admin" ? "warning" : "danger",
      confirmLabel: newRole === "admin" ? "Grant Admin" : "Revoke Admin",
      onConfirm: () => _doToggleRole(u.id),
    });
  };

  const _doToggleRole = async (userId) => {
    const newRole =
      users.find((u) => u.id === userId)?.role === "admin"
        ? "student"
        : "admin";
    const { error } = await supabase.rpc("admin_set_user_role", {
      p_user_id: userId,
      p_role: newRole,
    });
    if (error) {
      alert(error.message);
      return;
    }
    await logAdminAction(
      newRole === "admin" ? "GRANT_ADMIN" : "REVOKE_ADMIN",
      "user",
      userId,
    );
    await fetchAll();
  };

  const filteredUsers = users.filter((u) => {
    const search = userSearch.toLowerCase();
    return (
      u.full_name?.toLowerCase().includes(search) ||
      false ||
      u.business_name?.toLowerCase().includes(search) ||
      false ||
      u.email?.toLowerCase().includes(search) ||
      false
    );
  });

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* ── Header ─────────────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Shield size={20} className="text-indigo-400" />
          <h1 className="text-2xl font-black text-main">Admin Panel</h1>
        </div>
        <p className="text-sm text-muted">
          Manage users, content, and system settings
        </p>
      </div>

      {/* ── Stats ──────────────────────────────────────────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
              icon: UsersIcon,
              color: "text-emerald-400",
              bg: "bg-emerald-500/10",
              border: "border-emerald-500/20",
              glow: "shadow-emerald-500/10",
            },
            {
              label: "Pending Reports",
              value: stats.reports,
              icon: Flag,
              color: stats.reports > 0 ? "text-red-400" : "text-faint",
              bg: stats.reports > 0 ? "bg-red-500/10" : "bg-surface-2",
              border: stats.reports > 0 ? "border-red-500/20" : "border-app",
              glow: stats.reports > 0 ? "shadow-red-500/10" : "",
              onClick: () => setTab("reports"),
            },
          ].map((s) => (
            <div
              key={s.label}
              onClick={s.onClick}
              className={`bg-surface border ${s.border} rounded-2xl p-4 flex items-center gap-3 shadow-lg ${s.glow} ${s.onClick ? "cursor-pointer hover:scale-[1.02] transition-transform" : ""}`}
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
        {/* Sidebar tabs */}
        <div className="hidden md:flex flex-col gap-1 w-56 shrink-0 self-start sticky top-4">
          <div className="bg-surface border border-app rounded-2xl overflow-hidden shadow-sm">
            <div className="px-4 pt-4 pb-3 border-b border-app">
              <p className="text-[10px] font-black uppercase tracking-widest text-faint">
                Navigation
              </p>
            </div>
            <div className="p-2 flex flex-col gap-0.5">
              {TABS.map((t) => {
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
                    {t.id === "reports" && stats?.reports > 0 && (
                      <span
                        className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${active ? "bg-white/25 text-white" : "bg-red-500/20 text-red-400"}`}
                      >
                        {stats.reports}
                      </span>
                    )}
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
          {TABS.map((t) => {
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
                {t.id === "reports" && stats?.reports > 0 && (
                  <span
                    className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${active ? "bg-white/25 text-white" : "bg-red-500/20 text-red-400"}`}
                  >
                    {stats.reports}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── CONTENT AREA ──────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          {/* USERS TAB */}
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
                  icon={<UsersIcon size={40} />}
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
                          {name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-main truncate">
                            {name}
                          </p>
                          <p className="text-xs text-faint truncate">
                            {u.email}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <div className="flex-1 h-2 bg-surface-2 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${barColor} transition-all`}
                                style={{ width: `${trust}%` }}
                              />
                            </div>
                            <span className={`text-xs font-bold ${trustColor}`}>
                              {trust}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 shrink-0">
                          <button
                            onClick={() => resetTrust(u.id, name)}
                            className="px-2 py-1 text-[9px] font-black uppercase rounded-lg bg-surface-2 hover:bg-surface-3 text-muted transition-all"
                          >
                            Reset
                          </button>
                          <button
                            onClick={() => toggleRole(u)}
                            className={`px-2 py-1 text-[9px] font-black uppercase rounded-lg transition-all ${
                              u.role === "admin"
                                ? "bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20"
                                : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20"
                            }`}
                          >
                            {u.role === "admin" ? "Revoke" : "Grant"} Admin
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* REPORTS TAB */}
          {tab === "reports" && <AdminReportsPage />}

          {/* ADS & FAQ TABS */}
          {tab === "ads" && <AdminAdsTab />}
          {tab === "faq" && <AdminFaqTab />}

          {/* AUDIT LOGS TAB */}
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
      </div>

      {/* Confirm Modal */}
      {confirm && (
        <ConfirmModal {...confirm} onClose={() => setConfirm(null)} />
      )}
    </div>
  );
}

// ── Helper Components ─────────────────────────────────────────────────────────

function Empty({ icon, title, sub }) {
  return (
    <div className="text-center py-16 flex flex-col items-center gap-3">
      <div className="text-faint">{icon}</div>
      <p className="font-bold text-main">{title}</p>
      <p className="text-sm text-faint">{sub}</p>
    </div>
  );
}
