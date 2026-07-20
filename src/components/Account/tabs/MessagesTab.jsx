import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { MessageCircle, Lock, CheckCheck } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { useConversationsList } from "../../../hooks/useConversation";
import { isOnline } from "../../../hooks/usePresence";
import ChatThread from "../../Chat/ChatThread";

function timeAgo(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString();
}

function Avatar({ name, url, online }) {
  const initial = (name || "?").charAt(0).toUpperCase();
  return (
    <div className="relative shrink-0">
      {url ? (
        <img src={url} alt="" className="w-11 h-11 rounded-full object-cover" />
      ) : (
        <div className="w-11 h-11 rounded-full bg-brand-soft text-brand grid place-items-center font-bold text-sm">
          {initial}
        </div>
      )}
      {online && (
        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-surface" />
      )}
    </div>
  );
}

const TABS = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "closed", label: "Closed" },
];

export default function MessagesTab() {
  const { user } = useAuth();
  const { conversations, loading } = useConversationsList(user?.id);
  const [searchParams, setSearchParams] = useSearchParams();
  const [selected, setSelected] = useState(null); // { listingId, listingTitle, conversationId, otherParty }
  const [tab, setTab] = useState("all");

  // Entry point from ListingDetail's "Message on CampusConnect" button —
  // carries everything needed to open the thread immediately without an
  // extra round trip, then clears the query params so a refresh doesn't
  // re-trigger it.
  useEffect(() => {
    const listingId = searchParams.get("listing");
    if (!listingId || !user?.id) return;
    setSelected({
      listingId,
      listingTitle: searchParams.get("title") || "Listing",
      conversationId: null,
      otherParty: {
        id: searchParams.get("seller"),
        name: searchParams.get("sellerName") || "Seller",
        avatarUrl: searchParams.get("sellerAvatar") || null,
      },
    });
    setSearchParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const filtered = useMemo(() => {
    if (tab === "unread") return conversations.filter((c) => c.unread);
    if (tab === "closed") return conversations.filter((c) => c.status === "closed");
    return conversations;
  }, [conversations, tab]);

  const openConversation = (c) => {
    const isBuyer = c.buyer_id === user.id;
    const other = isBuyer ? c.seller : c.buyer;
    setSelected({
      listingId: c.listing_id,
      listingTitle: c.listing?.title || "Listing",
      conversationId: c.id,
      otherParty: {
        id: other?.id,
        name: other?.business_name || other?.full_name || "Unknown user",
        avatarUrl: other?.avatar_url,
      },
    });
  };

  const unreadCount = conversations.filter((c) => c.unread).length;

  return (
    <div className="flex h-[calc(100vh-180px)] min-h-[500px] border border-app rounded-xl overflow-hidden bg-surface">
      {/* List pane — hidden on mobile once a thread is open */}
      <div
        className={`w-full sm:w-[340px] shrink-0 border-r border-app flex flex-col ${
          selected ? "hidden sm:flex" : "flex"
        }`}
      >
        <div className="flex items-center gap-1.5 px-3 py-3 border-b border-app shrink-0">
          {TABS.map((t) => (
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
                    (tab === t.id ? "bg-white/25" : "bg-brand text-[hsl(var(--primary-fg))]")
                  }
                >
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <p className="text-xs text-faint p-4">Loading…</p>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 text-center py-16 px-6">
              <MessageCircle size={28} className="text-faint" />
              <p className="text-xs text-faint">
                {tab === "unread" ? "Nothing unread" : "No conversations here"}
              </p>
            </div>
          ) : (
            filtered.map((c) => {
              const isBuyer = c.buyer_id === user.id;
              const other = isBuyer ? c.seller : c.buyer;
              const otherName = other?.business_name || other?.full_name || "Unknown user";
              const mine = c.last_message_sender_id === user.id;
              const isActive = selected?.conversationId === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => openConversation(c)}
                  className={
                    "w-full flex items-center gap-3 px-3 py-3 text-left border-b border-app/50 transition-all " +
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
                      <p
                        className={
                          "text-sm truncate " +
                          (c.unread ? "font-bold text-main" : "font-medium text-main")
                        }
                      >
                        {otherName}
                      </p>
                      <span className="text-[10px] text-faint shrink-0">
                        {timeAgo(c.last_message_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {mine && <CheckCheck size={12} className="text-faint shrink-0" />}
                      <p
                        className={
                          "text-xs truncate " +
                          (c.unread ? "text-main font-medium" : "text-faint")
                        }
                      >
                        {c.last_message_body || "Say hello 👋"}
                      </p>
                    </div>
                    <p className="text-[10px] text-faint truncate flex items-center gap-1">
                      {c.status === "closed" && <Lock size={9} />}
                      {c.listing?.title || "Listing"}
                    </p>
                  </div>
                  {c.unread && (
                    <span className="w-2 h-2 rounded-full bg-brand shrink-0" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Thread pane */}
      <div className={`flex-1 ${selected ? "flex" : "hidden sm:flex"}`}>
        {selected ? (
          <ChatThread
            listingId={selected.listingId}
            listingTitle={selected.listingTitle}
            currentUserId={user.id}
            conversationId={selected.conversationId}
            otherParty={selected.otherParty}
            onBack={() => setSelected(null)}
          />
        ) : (
          <div className="hidden sm:flex flex-col items-center justify-center gap-2 w-full text-center px-6">
            <MessageCircle size={36} className="text-faint" />
            <p className="text-sm text-faint">Select a conversation to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
}
