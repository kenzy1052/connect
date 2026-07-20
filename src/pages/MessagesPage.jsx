import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { MessageCircle, Lock, CheckCheck, Check, Mic } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useConversationsList } from "../hooks/useConversation";
import { isOnline } from "../hooks/usePresence";
import ChatThread from "../components/Chat/ChatThread";

function timeAgo(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diff = now - d;
  if (diff < 60_000) return "now";
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  const days = Math.floor(diff / 86_400_000);
  if (days < 7) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { day: "numeric", month: "short" });
}

function Avatar({ name, url, online, size = 48 }) {
  const initial = (name || "?").charAt(0).toUpperCase();
  return (
    <div className="relative shrink-0">
      {url ? (
        <img
          src={url}
          alt=""
          className="rounded-full object-cover"
          style={{ width: size, height: size }}
        />
      ) : (
        <div
          className="rounded-full bg-brand-soft text-brand grid place-items-center font-bold"
          style={{ width: size, height: size, fontSize: size * 0.38 }}
        >
          {initial}
        </div>
      )}
      {online && (
        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-surface" />
      )}
    </div>
  );
}

/**
 * WhatsApp-style inbox.
 *   - Desktop: two-pane layout that fills the viewport below the navbar.
 *   - Mobile: single pane; opening a chat replaces the list.
 *   - Rows show avatar, name, last message preview, timestamp, unread count.
 *   - "All" tab clears unread on click immediately (no refresh needed).
 *
 * Layout note: MainApp gives this route a full-height flex column with no
 * padding, so we just need h-full here — no fixed positioning required.
 */
export default function MessagesPage() {
  const { user } = useAuth();
  const { conversations, loading, markReadLocally } = useConversationsList(user?.id);
  const [searchParams, setSearchParams] = useSearchParams();
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState("all");

  // Entry point from a listing's "Message the seller" button.
  // Builds a pre-filled draft greeting so the user doesn't start with a blank box.
  useEffect(() => {
    const listingId = searchParams.get("listing");
    if (!listingId || !user?.id) return;

    const title = searchParams.get("title") || "";
    const sellerId = searchParams.get("seller");
    const sellerName = searchParams.get("sellerName") || "Seller";
    const sellerAvatar = searchParams.get("sellerAvatar") || null;

    // Pre-fill a polite opener the user can edit before sending.
    const initialDraft = title
      ? `Hi, I'm interested in your listing "${title}". Is it still available?`
      : "Hi, I'm interested in one of your listings. Is it still available?";

    setSelected({
      listingId,
      conversationId: null,
      initialDraft,
      otherParty: {
        id: sellerId,
        name: sellerName,
        avatarUrl: sellerAvatar,
      },
    });
    setSearchParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const filtered = useMemo(
    () => (tab === "unread" ? conversations.filter((c) => c.unread) : conversations),
    [conversations, tab],
  );

  const openConversation = (c) => {
    const isBuyer = c.buyer_id === user.id;
    const other = isBuyer ? c.seller : c.buyer;
    setSelected({
      listingId: c.listing_id,
      conversationId: c.id,
      initialDraft: null,
      otherParty: {
        id: other?.id,
        name: other?.business_name || other?.full_name || "Unknown user",
        avatarUrl: other?.avatar_url,
      },
    });
    // Always mark read on click — clears the dot immediately in all tabs.
    // Person-scoped so it also clears unread messages sitting in any older
    // conversation thread with the same person, not just this row's thread.
    markReadLocally(other?.id);
  };

  const unreadCount = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);

  return (
    /* h-full works because MainApp gives us a flex-1 min-h-0 flex-col parent */
    <div className="flex h-full bg-app">
      {/* ── List pane ── */}
      <aside
        className={
          "w-full sm:w-[340px] shrink-0 border-r border-app flex flex-col bg-surface " +
          (selected ? "hidden sm:flex" : "flex")
        }
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-app shrink-0">
          <h1 className="text-lg font-bold text-main">Chats</h1>
          <div className="flex items-center gap-1.5">
            {[
              { id: "all", label: "All" },
              { id: "unread", label: "Unread" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all " +
                  (tab === t.id
                    ? "bg-brand text-[hsl(var(--primary-fg))]"
                    : "bg-surface-2 text-muted hover:text-main")
                }
              >
                {t.label}
                {t.id === "unread" && unreadCount > 0 && (
                  <span
                    className={
                      "text-[10px] px-1.5 rounded-full " +
                      (tab === t.id
                        ? "bg-white/25"
                        : "bg-brand text-[hsl(var(--primary-fg))]")
                    }
                  >
                    {unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <p className="text-xs text-faint p-4">Loading…</p>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 text-center py-20 px-6">
              <MessageCircle size={32} className="text-faint" />
              <p className="text-sm text-faint">
                {tab === "unread" ? "Nothing unread" : "No conversations yet"}
              </p>
              <p className="text-xs text-faint">
                Open a listing and tap "Message the seller" to start one.
              </p>
            </div>
          ) : (
            filtered.map((c) => {
              const isBuyer = c.buyer_id === user.id;
              const other = isBuyer ? c.seller : c.buyer;
              const otherName =
                other?.business_name || other?.full_name || "Unknown user";
              const mine = c.last_message_sender_id === user.id;
              const isActive = selected?.conversationId === c.id;
              const isVoice = c.last_message_body?.startsWith("🎤");
              const preview = isVoice
                ? "Voice message"
                : c.last_message_body || "Say hello 👋";

              return (
                <button
                  key={c.id}
                  onClick={() => openConversation(c)}
                  className={
                    "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors " +
                    (isActive ? "bg-surface-2" : "hover:bg-surface-2")
                  }
                >
                  <Avatar
                    name={otherName}
                    url={other?.avatar_url}
                    online={isOnline(other?.last_seen_at)}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-main truncate">
                        {otherName}
                      </p>
                      <span
                        className={
                          "text-[10px] shrink-0 " +
                          (c.unread ? "text-brand font-bold" : "text-faint")
                        }
                      >
                        {timeAgo(c.last_message_at)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <div className="flex items-center gap-1 min-w-0 flex-1">
                        {mine &&
                          (c.last_message_read_at ? (
                            <CheckCheck size={13} className="text-brand shrink-0" />
                          ) : (
                            <Check size={13} className="text-faint shrink-0" />
                          ))}
                        {isVoice && <Mic size={12} className="text-faint shrink-0" />}
                        <p
                          className={
                            "text-xs truncate " +
                            (c.unread && !mine
                              ? "text-main font-semibold"
                              : "text-faint")
                          }
                        >
                          {preview}
                        </p>
                      </div>
                      {c.unread_count > 0 && (
                        <span className="text-[10px] font-bold min-w-[18px] h-[18px] px-1.5 rounded-full bg-brand text-[hsl(var(--primary-fg))] grid place-items-center shrink-0">
                          {c.unread_count > 99 ? "99+" : c.unread_count}
                        </span>
                      )}
                      {c.status === "closed" && (
                        <Lock size={11} className="text-faint shrink-0" />
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* ── Thread pane ── */}
      <section className={"flex-1 min-w-0 min-h-0 " + (selected ? "flex" : "hidden sm:flex")}>
        {selected ? (
          <ChatThread
            key={selected.conversationId ?? selected.listingId}
            listingId={selected.listingId}
            currentUserId={user.id}
            conversationId={selected.conversationId}
            otherParty={selected.otherParty}
            initialDraft={selected.initialDraft}
            onBack={() => setSelected(null)}
          />
        ) : (
          <div className="hidden sm:flex flex-col items-center justify-center gap-3 w-full text-center px-6 bg-app">
            <div className="w-16 h-16 rounded-full bg-surface grid place-items-center">
              <MessageCircle size={28} className="text-faint" />
            </div>
            <div>
              <p className="text-sm font-semibold text-main">Your messages</p>
              <p className="text-xs text-faint mt-1">
                Select a conversation or start a new one from a listing.
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
