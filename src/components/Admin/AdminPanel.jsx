// src/components/Admin/AdminPanel.jsx
//
// TASK 4 FIX — Admin panel theming overhaul:
//
// Changes made:
//  1. Stats cards:   Removed hardcoded indigo/emerald/red colors.
//                    All icons, values and borders now use CSS theme variables.
//  2. Desktop sidebar: "bg-indigo-600 shadow-indigo-500/30" → "bg-brand"
//                    Active state uses --primary via the .bg-brand utility.
//  3. Mobile tabs:   Same change — active pill uses bg-brand / text-[hsl(var(--primary-fg))].
//  4. Users tab:     Avatar circle, trust bar, role badge all use theme vars.
//  5. Reports badge: Red bubble on sidebar uses hsl(var(--danger)) not text-red-400.
//
// Layout structure is NOT changed — sidebar/content split, sticky sidebar,
// mobile horizontal scroll tabs are all preserved.

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
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
  Users as UsersIcon,
  RefreshCw,
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

  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [tab, setTab] = useState("users");
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(null);
  const [userSearch, setUserSearch] = useState("");

  useEffect(() => {
    fetchAll();
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
          ? `Give ${u.business_name || u.full_name} full admin privileges?`
          : `Remove admin privileges from ${u.business_name || u.full_name}?`,
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
    const s = userSearch.toLowerCase();
    return (
      u.full_name?.toLowerCase().includes(s) ||
      u.business_name?.toLowerCase().includes(s) ||
      u.email?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          {/* Use text-brand — theme-aware primary color */}
          <Shield size={20} className="text-brand" />
          <h1 className="text-2xl font-black text-main">Admin Panel</h1>
        </div>
        <p className="text-sm text-muted">
          Manage users, content, and system settings
        </p>
      </div>

      {/* ── Stats cards ─────────────────────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              label: "Total Listings",
              value: stats.listings,
              icon: ListChecks,
              // All stat cards share the same neutral theme styling.
              // The "Pending Reports" card gets a danger tint only when > 0.
            },
            {
              label: "Total Users",
              value: stats.users,
              icon: UsersIcon,
            },
            {
              label: "Pending Reports",
              value: stats.reports,
              icon: Flag,
              isDanger: stats.reports > 0,
              onClick: () => setTab("reports"),
            },
          ].map((s) => (
            <div
              key={s.label}
              onClick={s.onClick}
              className={`
                bg-surface border border-app rounded-2xl p-4
                flex items-center gap-3
                ${s.onClick ? "cursor-pointer hover:border-[hsl(var(--primary)/0.4)] hover:scale-[1.01] transition-all" : ""}
                ${s.isDanger ? "border-[hsl(var(--danger)/0.3)]" : ""}
              `}
            >
              {/* Icon bubble — soft brand bg, danger tint when needed */}
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: s.isDanger
                    ? "hsl(var(--danger) / 0.1)"
                    : "hsl(var(--primary) / 0.1)",
                }}
              >
                <s.icon
                  size={18}
                  style={{
                    color: s.isDanger
                      ? "hsl(var(--danger))"
                      : "hsl(var(--primary))",
                  }}
                />
              </div>

              <div>
                <div
                  className="text-2xl font-black"
                  style={{
                    color: s.isDanger
                      ? "hsl(var(--danger))"
                      : "hsl(var(--text))",
                  }}
                >
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

      {/* ── Layout: sidebar + content ────────────────────────────── */}
      <div className="flex flex-col md:flex-row gap-5" style={{ minHeight: 0 }}>
        {/* Desktop sidebar — layout unchanged, colors now use theme vars */}
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
                    className={`
                      w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                      text-sm font-bold transition-all text-left group
                      ${
                        active
                          ? "bg-brand text-[hsl(var(--primary-fg))]"
                          : "text-muted hover:text-main hover:bg-surface-2"
                      }
                    `}
                  >
                    <div
                      className={`
                        w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors
                        ${active ? "bg-[hsl(var(--primary-fg)/0.15)]" : "bg-surface-2 group-hover:bg-surface-3"}
                      `}
                    >
                      <t.icon
                        size={14}
                        className={
                          active
                            ? "text-[hsl(var(--primary-fg))]"
                            : "text-faint group-hover:text-main"
                        }
                      />
                    </div>
                    <span className="flex-1 text-[13px]">{t.label}</span>

                    {/* Reports count badge — danger tint when inactive */}
                    {t.id === "reports" && stats?.reports > 0 && (
                      <span
                        className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
                        style={
                          active
                            ? {
                                background: "hsl(var(--primary-fg)/0.2)",
                                color: "hsl(var(--primary-fg))",
                              }
                            : {
                                background: "hsl(var(--danger)/0.15)",
                                color: "hsl(var(--danger))",
                              }
                        }
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

        {/* Mobile horizontal tabs — fully themed, no hardcoded color */}
        <div className="md:hidden flex items-center gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`
                  flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold
                  shrink-0 transition-all
                  ${
                    active
                      ? "bg-brand text-[hsl(var(--primary-fg))]"
                      : "bg-surface border border-app text-muted hover:text-main hover:border-[hsl(var(--border))]"
                  }
                `}
              >
                <t.icon size={13} />
                {t.label}

                {/* Reports count badge */}
                {t.id === "reports" && stats?.reports > 0 && (
                  <span
                    className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
                    style={
                      active
                        ? {
                            background: "hsl(var(--primary-fg)/0.2)",
                            color: "hsl(var(--primary-fg))",
                          }
                        : {
                            background: "hsl(var(--danger)/0.15)",
                            color: "hsl(var(--danger))",
                          }
                    }
                  >
                    {stats.reports}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Content area ────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          {/* USERS TAB */}
          {tab === "users" && (
            <div className="space-y-3">
              <input
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search users by name or email…"
                className="w-full bg-surface border border-app rounded-xl px-4 py-3 text-sm text-main placeholder:text-faint focus:outline-none focus:border-[hsl(var(--primary)/0.6)] transition-colors mb-1"
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

                  // Theme-aware trust tier colors using CSS vars
                  const trustStyle =
                    trust >= 70
                      ? { color: "hsl(var(--success, 157 90% 42%))" }
                      : trust >= 40
                        ? { color: "hsl(var(--primary))" }
                        : { color: "hsl(var(--danger))" };

                  const barStyle =
                    trust >= 70
                      ? {
                          background: "hsl(var(--success, 157 90% 42%))",
                          width: `${trust}%`,
                        }
                      : trust >= 40
                        ? {
                            background: "hsl(var(--primary))",
                            width: `${trust}%`,
                          }
                        : {
                            background: "hsl(var(--danger))",
                            width: `${trust}%`,
                          };

                  const isAdmin = u.role === "admin";

                  return (
                    <div
                      key={u.id}
                      className="bg-surface border border-app rounded-2xl p-4"
                    >
                      <div className="flex items-start gap-3">
                        {/* Avatar — uses brand-soft, theme-aware */}
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center font-black text-sm shrink-0"
                          style={{
                            background: "hsl(var(--primary)/0.12)",
                            color: "hsl(var(--primary))",
                            border: "1px solid hsl(var(--primary)/0.2)",
                          }}
                        >
                          {name.charAt(0).toUpperCase()}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-main truncate">
                            {name}
                          </p>
                          <p className="text-xs text-faint truncate">
                            {u.email}
                          </p>

                          {/* Trust bar */}
                          <div className="flex items-center gap-2 mt-2">
                            <div className="flex-1 h-1.5 bg-surface-2 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={barStyle}
                              />
                            </div>
                            <span
                              className="text-xs font-bold tabular-nums"
                              style={trustStyle}
                            >
                              {trust}
                            </span>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-col gap-1.5 shrink-0">
                          <button
                            onClick={() => resetTrust(u.id, name)}
                            className="px-2 py-1 text-[9px] font-black uppercase rounded-lg bg-surface-2 hover:bg-surface-3 text-muted hover:text-main transition-all"
                          >
                            Reset
                          </button>
                          <button
                            onClick={() => toggleRole(u)}
                            className="px-2 py-1 text-[9px] font-black uppercase rounded-lg transition-all"
                            style={
                              isAdmin
                                ? {
                                    background: "hsl(var(--danger)/0.1)",
                                    color: "hsl(var(--danger))",
                                    border: "1px solid hsl(var(--danger)/0.25)",
                                  }
                                : {
                                    background:
                                      "hsl(var(--success, 157 90% 42%)/0.1)",
                                    color: "hsl(var(--success, 157 90% 42%))",
                                    border:
                                      "1px solid hsl(var(--success, 157 90% 42%)/0.25)",
                                  }
                            }
                          >
                            {isAdmin ? "Revoke" : "Grant"} Admin
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

          {/* ADS TAB */}
          {tab === "ads" && <AdminAdsTab />}

          {/* FAQ TAB */}
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

      {confirm && (
        <ConfirmModal {...confirm} onClose={() => setConfirm(null)} />
      )}
    </div>
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
