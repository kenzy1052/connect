import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Bell,
  MessageSquare,
  Heart,
  ShieldAlert,
  FileText,
  Megaphone,
} from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";

/**
 * NotificationBell — bell icon + dropdown showing recent notifications.
 *
 * Source of truth: `notifications` table with shape:
 *   { id, user_id, type, title, body, link, is_read, created_at }
 *
 * If the table doesn't exist yet, we fail silently with an empty list.
 * Click an item -> mark as read + navigate to its link.
 */

const TYPE_META = {
  faq: { Icon: MessageSquare, color: "text-brand" },
  saved: { Icon: Heart, color: "text-rose-500" },
  report: { Icon: ShieldAlert, color: "text-amber-400" },
  admin: { Icon: Megaphone, color: "text-[hsl(var(--accent))]" },
  default: { Icon: FileText, color: "text-muted" },
};

function timeAgo(d) {
  const diff = (Date.now() - new Date(d).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function NotificationBell() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef(null);

  const isAdmin = profile?.role === "admin";

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target))
        setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);

  // Fetch on mount + on open
  const fetchItems = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("notifications")
      .select("id, type, title, body, link, is_read, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(12);

    if (error) {
      // Table likely doesn't exist yet — just show empty.
      setItems([]);
    } else {
      setItems(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchItems(); /* eslint-disable-next-line */
  }, [user]);
  useEffect(() => {
    if (open) fetchItems(); /* eslint-disable-next-line */
  }, [open]);

  const unread = items.filter((i) => !i.is_read).length;
  const adminBadge = isAdmin ? unread : 0;

  const handleItemClick = async (n) => {
    setOpen(false);
    if (!n.is_read) {
      // Optimistic
      setItems((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)),
      );
      supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", n.id)
        .then(() => {});
    }
    if (n.link) navigate(n.link);
  };

  const markAllRead = async () => {
    setItems((prev) => prev.map((x) => ({ ...x, is_read: true })));
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
  };

  return (
    <div ref={wrapRef} className="relative z-[170]">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`relative h-10 w-10 grid place-items-center rounded-md transition-colors ${
          open
            ? "bg-surface-2 text-main"
            : "text-muted hover:text-main hover:bg-surface-2"
        }`}
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell size={18} />
        {(unread > 0 || adminBadge > 0) && (
          <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-[hsl(var(--danger))] text-white text-[10px] font-bold grid place-items-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="bg-surface border border-app rounded-md shadow-2xl overflow-hidden"
          style={{
            position: window.innerWidth <= 480 ? "fixed" : "absolute",
            top: window.innerWidth <= 480 ? "var(--nav-height, 7rem)" : "3rem",
            left: window.innerWidth <= 480 ? "8px" : "auto",
            right: window.innerWidth <= 480 ? "8px" : 0,
            width: window.innerWidth <= 480 ? "auto" : "22rem",
            zIndex: 190,
          }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-app">
            <p className="text-sm font-semibold text-main">Notifications</p>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="text-[11px] font-semibold text-brand hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {loading && items.length === 0 && (
              <div className="px-4 py-8 text-center text-xs text-faint">
                Loading…
              </div>
            )}

            {!loading && items.length === 0 && (
              <div className="px-4 py-10 text-center">
                <Bell size={20} className="mx-auto mb-2 text-faint" />
                <p className="text-sm font-medium text-main">
                  You're all caught up
                </p>
                <p className="text-xs text-muted mt-1">
                  Notifications about your listings, reports and replies appear
                  here.
                </p>
              </div>
            )}

            <ul>
              {items.map((n) => {
                const meta = TYPE_META[n.type] || TYPE_META.default;
                const Icon = meta.Icon;
                return (
                  <li key={n.id}>
                    <button
                      onClick={() => handleItemClick(n)}
                      className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-surface-2 transition-colors border-b border-app last:border-0 ${
                        !n.is_read ? "bg-[hsl(var(--primary)/0.04)]" : ""
                      }`}
                    >
                      <span
                        className={`shrink-0 w-8 h-8 rounded-md grid place-items-center bg-surface-2 ${meta.color}`}
                      >
                        <Icon size={15} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-2">
                          <span className="text-sm font-medium text-main truncate">
                            {n.title}
                          </span>
                          {!n.is_read && (
                            <span className="mt-1 shrink-0 w-1.5 h-1.5 rounded-full bg-brand" />
                          )}
                        </span>
                        {n.body && (
                          <span className="block text-xs text-muted line-clamp-2 mt-0.5">
                            {n.body}
                          </span>
                        )}
                        <span className="block text-[10px] text-faint mt-1 uppercase tracking-wider">
                          {timeAgo(n.created_at)}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="px-4 py-2.5 border-t border-app bg-surface-2/40 flex items-center justify-between">
            <Link
              to="/account/notifications"
              onClick={() => setOpen(false)}
              className="text-[12px] font-semibold text-brand hover:underline"
            >
              Notification settings
            </Link>
            {isAdmin && (
              <Link
                to="/admin"
                onClick={() => setOpen(false)}
                className="text-[12px] font-semibold text-muted hover:text-main"
              >
                Admin alerts →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
