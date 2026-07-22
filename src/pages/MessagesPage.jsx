import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  MessageCircle,
  Lock,
  CheckCheck,
  Check,
  Mic,
  Search,
  X,
} from "lucide-react";
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

function Avatar({ name, url, online, size = 52 }) {
  const initial = (name || "?").charAt(0).toUpperCase();
  return (
    <div className="relative shrink-0">
      {url ? (
        <img
          src={url}
          alt=""
          className="rounded-md object-cover shrink-0 transition-transform duration-200"
          style={{ width: size, height: size }}
        />
      ) : (
        <div
          className="rounded-md bg-brand/10 text-brand font-bold grid place-items-center shrink-0 transition-transform duration-200"
          style={{ width: size, height: size, fontSize: size * 0.38 }}
        >
          {initial}
        </div>
      )}
      {online && (
        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 shadow-xs animate-pulse" />
      )}
    </div>
  );
}

export default function MessagesPage() {
  const { user } = useAuth();
  const { conversations, loading, markReadLocally } = useConversationsList(
    user?.id,
  );
  const [searchParams, setSearchParams] = useSearchParams();
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const listingId = searchParams.get("listing");
    if (!listingId || !user?.id) return;

    const title = searchParams.get("title") || "";
    const sellerId = searchParams.get("seller");
    const sellerName = searchParams.get("sellerName") || "Seller";
    const sellerAvatar = searchParams.get("sellerAvatar") || null;

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

  const filtered = useMemo(() => {
    let list =
      tab === "unread" ? conversations.filter((c) => c.unread) : conversations;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((c) => {
        const isBuyer = c.buyer_id === user?.id;
        const other = isBuyer ? c.seller : c.buyer;
        const name = (
          other?.business_name ||
          other?.full_name ||
          ""
        ).toLowerCase();
        return name.includes(q);
      });
    }
    return list;
  }, [conversations, tab, searchQuery, user?.id]);

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
    markReadLocally(other?.id);
  };

  const unreadCount = conversations.reduce(
    (sum, c) => sum + (c.unread_count || 0),
    0,
  );

  return (
    <div className="flex h-full bg-app overflow-hidden">
      {/* ── Sidebar List Pane ── */}
      <aside
        className={
          "w-full sm:w-[360px] lg:w-[380px] shrink-0 flex flex-col bg-surface transition-all duration-200 " +
          (selected ? "hidden sm:flex" : "flex")
        }
      >
        {/* Header & Tabs */}
        <div className="px-5 pt-5 pb-3 shrink-0 space-y-3.5 bg-surface z-10">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-extrabold text-main tracking-tight">
              Messages
            </h1>
            <div className="flex items-center gap-1 bg-surface-2 p-1 rounded-md">
              {[
                { id: "all", label: "All" },
                { id: "unread", label: "Unread" },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={
                    "flex items-center gap-1.5 px-3 py-1 rounded-sm text-xs font-semibold transition-all duration-150 " +
                    (tab === t.id
                      ? "bg-brand text-[hsl(var(--primary-fg))] shadow-2xs"
                      : "text-muted hover:text-main hover:bg-surface/50")
                  }
                >
                  {t.label}
                  {t.id === "unread" && unreadCount > 0 && (
                    <span
                      className={
                        "text-[10px] px-1.5 py-0.5 rounded-sm font-bold leading-none transition-colors " +
                        (tab === t.id
                          ? "bg-white/20 text-white"
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

          {/* Search Bar */}
          <div className="relative flex items-center">
            <Search
              size={15}
              className="absolute left-3.5 text-faint pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-9 pr-8 py-2 bg-surface-2 hover:bg-surface-2/90 focus:bg-surface-2 rounded-md text-xs text-main placeholder:text-faint outline-none transition-all duration-150"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 p-1 text-faint hover:text-main rounded-sm transition-colors"
                aria-label="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto chat-scroll-thin p-2 space-y-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-2">
              <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-faint font-medium">
                Loading your chats…
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-16 px-6">
              <div className="w-14 h-14 rounded-md bg-surface-2 flex items-center justify-center mb-3 text-faint">
                <MessageCircle size={26} strokeWidth={1.5} />
              </div>
              <p className="text-sm font-semibold text-main">
                {searchQuery
                  ? "No matches found"
                  : tab === "unread"
                    ? "All caught up!"
                    : "No messages yet"}
              </p>
              <p className="text-xs text-faint mt-1 max-w-[220px] leading-relaxed">
                {searchQuery
                  ? `We couldn't find any chats matching "${searchQuery}".`
                  : "Open any marketplace listing and tap 'Message the seller' to start a conversation."}
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
                    "w-full flex items-center gap-3.5 p-3 rounded-md text-left transition-all duration-150 group relative select-none " +
                    (isActive
                      ? "bg-brand/10 dark:bg-brand/15 font-medium"
                      : "hover:bg-surface-2")
                  }
                >
                  {/* Active Indicator Bar */}
                  {isActive && (
                    <span className="absolute left-0 top-2 bottom-2 w-1 bg-brand rounded-r-sm" />
                  )}

                  <Avatar
                    name={otherName}
                    url={other?.avatar_url}
                    online={isOnline(other?.last_seen_at)}
                    size={48}
                  />

                  <div className="min-w-0 flex-1 py-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={
                          "text-sm font-semibold truncate transition-colors " +
                          (isActive
                            ? "text-brand dark:text-white"
                            : "text-main group-hover:text-brand")
                        }
                      >
                        {otherName}
                      </p>
                      <span
                        className={
                          "text-[11px] shrink-0 font-medium tabular-nums transition-colors " +
                          (c.unread ? "text-brand font-bold" : "text-faint")
                        }
                      >
                        {timeAgo(c.last_message_at)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-1">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        {mine &&
                          (c.last_message_read_at ? (
                            <CheckCheck
                              size={14}
                              className="text-sky-500 shrink-0"
                            />
                          ) : (
                            <Check size={14} className="text-faint shrink-0" />
                          ))}
                        {isVoice && (
                          <Mic
                            size={13}
                            className="text-brand shrink-0 animate-pulse"
                          />
                        )}
                        <p
                          className={
                            "text-xs truncate leading-relaxed " +
                            (c.unread && !mine
                              ? "text-main font-semibold"
                              : "text-muted group-hover:text-main/90")
                          }
                        >
                          {preview}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {c.unread_count > 0 && (
                          <span className="min-w-[20px] h-[20px] px-1.5 rounded-sm bg-brand text-[hsl(var(--primary-fg))] font-bold text-[10px] flex items-center justify-center">
                            {c.unread_count > 99 ? "99+" : c.unread_count}
                          </span>
                        )}
                        {c.status === "closed" && (
                          <div
                            className="p-1 rounded-sm bg-surface-2 text-faint"
                            title="Closed"
                          >
                            <Lock size={11} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* ── Main Thread Pane ── */}
      <section
        className={
          "flex-1 min-w-0 min-h-0 bg-surface border border-white/5 shadow-xl " +
          (selected ? "flex" : "hidden sm:flex")
        }
      >
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
          <div className="hidden sm:flex flex-col items-center justify-center gap-4 w-full text-center px-6 bg-app">
            <div className="w-16 h-16 rounded-md bg-surface flex items-center justify-center text-brand">
              <MessageCircle size={32} strokeWidth={1.5} />
            </div>
            <div className="max-w-xs space-y-1">
              <p className="text-base font-bold text-main">Your Messages</p>
              <p className="text-xs text-faint leading-relaxed">
                Select an existing conversation from the left or start a new
                inquiry directly from a seller's listing.
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
