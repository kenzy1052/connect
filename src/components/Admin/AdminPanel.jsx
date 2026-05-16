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
  ListChecks,
  Flag,
  RefreshCw,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";

// ── Section definitions ────────────────────────────────────────────────────
const SECTIONS = [
  {
    id: "users",
    icon: Users,
    label: "Users",
    description: "Search, manage roles and trust scores",
    color: "text-indigo-400",
    bg: "bg-indigo-500/10",
    border: "border-indigo-500/20",
  },
  {
    id: "reports",
    icon: Flag,
    label: "Reports",
    description: "Review reported listings and take action",
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
  },
  {
    id: "ads",
    icon: Megaphone,
    label: "Ads",
    description: "Manage sponsored ad banners",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
  },
  {
    id: "faq",
    icon: MessageSquare,
    label: "FAQ",
    description: "Edit frequently asked questions",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
  },
  {
    id: "audit",
    icon: ClipboardList,
    label: "Audit Log",
    description: "View all recent admin actions",
    color: "text-sky-400",
    bg: "bg-sky-500/10",
    border: "border-sky-500/20",
  },
];

// ── Stat card ──────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color, bg, border, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`bg-surface border ${border} rounded-2xl p-4 flex items-center gap-3 shadow-sm ${
        onClick ? "cursor-pointer active:scale-[0.97] transition-transform" : ""
      }`}
    >
      <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
        <Icon size={18} className={color} />
      </div>
      <div>
        <div className={`text-2xl font-black ${color}`}>{value}</div>
        <div className="text-[10px] text-faint uppercase tracking-wide font-bold leading-tight mt-0.5">
          {label}
        </div>
      </div>
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────
function Empty({ icon, title, sub }) {
  return (
    <div className="text-center py-16 flex flex-col items-center gap-3">
      <div className="text-faint">{icon}</div>
      <p className="font-bold text-main">{title}</p>
      <p className="text-sm text-faint">{sub}</p>
    </div>
  );
}

// ── Mobile menu card ───────────────────────────────────────────────────────
function MenuCard({ section, badge, onClick }) {
  const Icon = section.icon;
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 bg-surface border ${section.border} rounded-2xl p-4 text-left active:scale-[0.98] transition-all hover:shadow-md`}
    >
      <div className={`w-11 h-11 rounded-xl ${section.bg} flex items-center justify-center shrink-0`}>
        <Icon size={20} className={section.color} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-black text-main">{section.label}</p>
        <p className="text-xs text-faint mt-0.5 leading-snug">{section.description}</p>
      </div>
      {badge > 0 && (
        <span className="shrink-0 min-w-[22px] h-5 px-1.5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-black grid place-items-center">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
      <ChevronRight size={16} className="text-faint shrink-0" />
    </button>
  );
}

// ── Users tab content ──────────────────────────────────────────────────────
function UsersTab({ users, userSearch, setUserSearch, resetTrust, toggleRole }) {
  const filtered = users.filter((u) => {
    const q = userSearch.toLowerCase();
    return (
      u.full_name?.toLowerCase().includes(q) ||
      u.business_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-3">
      <input
        value={userSearch}
        onChange={(e) => setUserSearch(e.target.value)}
        placeholder="Search users by name or email…"
        className="w-full bg-surface border border-app rounded-xl px-4 py-3 text-sm text-main placeholder-faint focus:outline-none focus:border-indigo-500/60 transition-colors"
      />
      {filtered.length === 0 ? (
        <Empty icon={<Users size={40} />} title="No users found" sub="Try a different search." />
      ) : (
        filtered.map((u) => {
          const name = u.business_name || u.full_name || "Unknown";
          const trust = u.trust_score ?? 50;
          const trustColor = trust >= 70 ? "text-emerald-400" : trust >= 40 ? "text-indigo-400" : "text-red-400";
          const barColor   = trust >= 70 ? "bg-emerald-400"  : trust >= 40 ? "bg-indigo-400"  : "bg-red-400";
          return (
            <div key={u.id} className="bg-surface border border-app rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-600/20 border border-indigo-500/20 flex items-center justify-center text-indigo-300 font-black text-sm shrink-0">
                  {name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-main truncate">{name}</p>
                  <p className="text-xs text-faint truncate">{u.email}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 h-2 bg-surface-2 rounded-full overflow-hidden">
                      <div className={`h-full ${barColor} transition-all`} style={{ width: `${trust}%` }} />
                    </div>
                    <span className={`text-xs font-bold ${trustColor}`}>{trust}</span>
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
  );
}

// ── Audit tab content ──────────────────────────────────────────────────────
function AuditTab({ logs }) {
  if (logs.length === 0)
    return (
      <Empty
        icon={<ClipboardList size={40} />}
        title="No audit logs yet"
        sub="Actions will be recorded here."
      />
    );
  return (
    <div className="space-y-2">
      {logs.map((log) => (
        <div
          key={log.id}
          className="bg-surface border border-app rounded-xl px-5 py-3.5 flex items-center justify-between gap-4"
        >
          <div>
            <p className="text-sm text-main font-bold">{log.action.replaceAll("_", " ")}</p>
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
      ))}
    </div>
  );
}

// ── Main AdminPanel ────────────────────────────────────────────────────────
export default function AdminPanel() {
  const { user } = useAuth();

  const [users, setUsers]         = useState([]);
  const [logs, setLogs]           = useState([]);
  const [stats, setStats]         = useState(null);
  const [loading, setLoading]     = useState(true);
  const [confirm, setConfirm]     = useState(null);
  const [userSearch, setUserSearch] = useState("");

  // Navigation state
  // activeSection: null (menu) | "users" | "reports" | "ads" | "faq" | "audit"
  const [activeSection, setActiveSection] = useState(null);

  useEffect(() => { fetchAll(); }, []);

  useEffect(() => {
    if (activeSection === "audit") fetchLogs();
  }, [activeSection]);

  const fetchAll = async () => {
    setLoading(true);
    const [usersRes, listingsCountRes, usersCountRes, reportsCountRes] = await Promise.all([
      supabase.from("profiles").select("*").order("trust_score", { ascending: true }),
      supabase.from("listings").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("reports").select("*", { count: "exact", head: true }).eq("is_resolved", false),
    ]);

    if (usersRes.data) setUsers(usersRes.data);
    setStats({
      listings: listingsCountRes.count ?? 0,
      users:    usersCountRes.count    ?? 0,
      reports:  reportsCountRes.count  ?? 0,
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
      onConfirm: async () => {
        const { error } = await supabase.rpc("admin_reset_trust", { p_user_id: userId });
        if (error) { alert(error.message); return; }
        await fetchAll();
      },
    });
  };

  const toggleRole = (u) => {
    const newRole = u.role === "admin" ? "student" : "admin";
    const name = u.business_name || u.full_name;
    setConfirm({
      title: newRole === "admin" ? "Grant Admin Access?" : "Revoke Admin Access?",
      message:
        newRole === "admin"
          ? `Give ${name} full admin privileges?`
          : `Remove admin privileges from ${name}?`,
      variant: newRole === "admin" ? "warning" : "danger",
      confirmLabel: newRole === "admin" ? "Grant Admin" : "Revoke Admin",
      onConfirm: async () => {
        const { error } = await supabase.rpc("admin_set_user_role", {
          p_user_id: u.id,
          p_role: newRole,
        });
        if (error) { alert(error.message); return; }
        await logAdminAction(
          newRole === "admin" ? "GRANT_ADMIN" : "REVOKE_ADMIN",
          "user",
          u.id,
        );
        await fetchAll();
      },
    });
  };

  // ── Section content renderer ─────────────────────────────────────────────
  const renderSectionContent = () => {
    switch (activeSection) {
      case "users":
        return (
          <UsersTab
            users={users}
            userSearch={userSearch}
            setUserSearch={setUserSearch}
            resetTrust={resetTrust}
            toggleRole={toggleRole}
          />
        );
      case "reports":
        return <AdminReportsPage />;
      case "ads":
        return <AdminAdsTab />;
      case "faq":
        return <AdminFaqTab />;
      case "audit":
        return <AuditTab logs={logs} />;
      default:
        return null;
    }
  };

  const currentSection = SECTIONS.find((s) => s.id === activeSection);

  // ════════════════════════════════════════════════════════════════════════
  // MOBILE VIEW: full-screen section with back button
  // ════════════════════════════════════════════════════════════════════════
  if (activeSection) {
    return (
      <>
        {/* Mobile header with back */}
        <div className="md:hidden sticky top-0 z-30 bg-surface border-b border-app flex items-center gap-3 px-4 py-3.5">
          <button
            onClick={() => setActiveSection(null)}
            className="w-9 h-9 rounded-xl bg-surface-2 hover:bg-surface-3 flex items-center justify-center transition-colors"
          >
            <ArrowLeft size={18} className="text-main" />
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {currentSection && (
              <div className={`w-7 h-7 rounded-lg ${currentSection.bg} flex items-center justify-center shrink-0`}>
                {currentSection && <currentSection.icon size={14} className={currentSection.color} />}
              </div>
            )}
            <h1 className="text-base font-black text-main truncate">
              {currentSection?.label ?? "Admin"}
            </h1>
          </div>
          <button
            onClick={fetchAll}
            className="w-9 h-9 rounded-xl bg-surface-2 flex items-center justify-center"
          >
            <RefreshCw size={15} className="text-faint" />
          </button>
        </div>

        {/* Desktop: show full panel layout (back button is irrelevant) */}
        {/* ── DESKTOP LAYOUT (sidebar stays visible) ── */}
        <div className="hidden md:flex p-6 gap-5">
          <DesktopSidebar
            activeSection={activeSection}
            setActiveSection={setActiveSection}
            stats={stats}
            fetchAll={fetchAll}
          />
          <div className="flex-1 min-w-0">
            {renderSectionContent()}
          </div>
        </div>

        {/* Mobile: content only */}
        <div className="md:hidden p-4">
          {renderSectionContent()}
        </div>

        {confirm && <ConfirmModal {...confirm} onClose={() => setConfirm(null)} />}
      </>
    );
  }

  // ════════════════════════════════════════════════════════════════════════
  // MENU VIEW (no section selected)
  // ════════════════════════════════════════════════════════════════════════
  return (
    <>
      {/* ── DESKTOP: full sidebar + empty state ── */}
      <div className="hidden md:flex p-6 gap-5">
        <DesktopSidebar
          activeSection={activeSection}
          setActiveSection={setActiveSection}
          stats={stats}
          fetchAll={fetchAll}
        />
        <div className="flex-1 min-w-0 flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-4">
              <Shield size={28} className="text-indigo-400" />
            </div>
            <p className="font-black text-main text-lg">Admin Panel</p>
            <p className="text-sm text-faint mt-1">Select a section from the sidebar</p>
          </div>
        </div>
      </div>

      {/* ── MOBILE: full-screen menu ── */}
      <div className="md:hidden p-4 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Shield size={18} className="text-indigo-400" />
              <h1 className="text-xl font-black text-main">Admin Panel</h1>
            </div>
            <p className="text-xs text-muted mt-0.5">Manage users, content and settings</p>
          </div>
          <button
            onClick={fetchAll}
            disabled={loading}
            className="w-9 h-9 rounded-xl bg-surface-2 hover:bg-surface-3 flex items-center justify-center transition-colors disabled:opacity-50"
          >
            <RefreshCw size={15} className={`text-faint ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Stats row */}
        {stats && (
          <div className="grid grid-cols-3 gap-2.5">
            <div className="bg-surface border border-indigo-500/20 rounded-2xl p-3 text-center">
              <p className="text-xl font-black text-indigo-400">{stats.listings}</p>
              <p className="text-[9px] text-faint uppercase tracking-wider font-bold mt-0.5 leading-tight">Listings</p>
            </div>
            <div className="bg-surface border border-emerald-500/20 rounded-2xl p-3 text-center">
              <p className="text-xl font-black text-emerald-400">{stats.users}</p>
              <p className="text-[9px] text-faint uppercase tracking-wider font-bold mt-0.5 leading-tight">Users</p>
            </div>
            <div
              onClick={() => setActiveSection("reports")}
              className={`rounded-2xl p-3 text-center cursor-pointer active:scale-95 transition-transform border ${
                stats.reports > 0
                  ? "bg-red-500/10 border-red-500/25"
                  : "bg-surface border-app"
              }`}
            >
              <p className={`text-xl font-black ${stats.reports > 0 ? "text-red-400" : "text-faint"}`}>
                {stats.reports}
              </p>
              <p className="text-[9px] text-faint uppercase tracking-wider font-bold mt-0.5 leading-tight">Reports</p>
            </div>
          </div>
        )}

        {/* Menu cards */}
        <div className="space-y-2.5">
          <p className="text-[10px] font-black uppercase tracking-widest text-faint px-0.5">
            Sections
          </p>
          {SECTIONS.map((section) => (
            <MenuCard
              key={section.id}
              section={section}
              badge={section.id === "reports" ? stats?.reports : 0}
              onClick={() => setActiveSection(section.id)}
            />
          ))}
        </div>
      </div>

      {confirm && <ConfirmModal {...confirm} onClose={() => setConfirm(null)} />}
    </>
  );
}

// ── Reusable desktop sidebar ───────────────────────────────────────────────
function DesktopSidebar({ activeSection, setActiveSection, stats, fetchAll }) {
  return (
    <div className="hidden md:flex flex-col gap-1 w-56 shrink-0 self-start sticky top-4">
      <div className="bg-surface border border-app rounded-2xl overflow-hidden shadow-sm">
        <div className="px-4 pt-4 pb-3 border-b border-app flex items-center gap-2">
          <Shield size={14} className="text-indigo-400" />
          <p className="text-[10px] font-black uppercase tracking-widest text-faint">Admin</p>
        </div>
        <div className="p-2 flex flex-col gap-0.5">
          {SECTIONS.map((s) => {
            const active = activeSection === s.id;
            const badge  = s.id === "reports" ? stats?.reports : 0;
            return (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all text-left group ${
                  active
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30"
                    : "text-muted hover:text-main hover:bg-surface-2"
                }`}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                  active ? "bg-white/20" : "bg-surface-2 group-hover:bg-surface-3"
                }`}>
                  <s.icon size={14} className={active ? "text-white" : "text-faint group-hover:text-main"} />
                </div>
                <span className="flex-1 text-[13px]">{s.label}</span>
                {badge > 0 && (
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                    active ? "bg-white/25 text-white" : "bg-red-500/20 text-red-400"
                  }`}>
                    {badge}
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
              <RefreshCw size={13} className="group-hover:rotate-180 transition-transform duration-500" />
            </div>
            Refresh Data
          </button>
        </div>
      </div>
    </div>
  );
}
