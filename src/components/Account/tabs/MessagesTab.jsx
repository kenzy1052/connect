import { useState } from "react";
import { MessageCircle, Lock } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { useConversationsList } from "../../../hooks/useConversation";
import ChatPanel from "../../Chat/ChatPanel";

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function MessagesTab() {
  const { user } = useAuth();
  const { conversations, loading } = useConversationsList(user?.id);
  const [active, setActive] = useState(null);

  return (
    <div className="space-y-3">
      {loading ? (
        <p className="text-xs text-faint">Loading conversations…</p>
      ) : conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 text-center py-16">
          <MessageCircle size={32} className="text-faint" />
          <p className="text-sm text-muted">No conversations yet</p>
          <p className="text-xs text-faint max-w-xs">
            When you message a seller, or a buyer messages you about your
            listing, it'll show up here.
          </p>
        </div>
      ) : (
        conversations.map((c) => {
          const isBuyer = c.buyer_id === user.id;
          const other = isBuyer ? c.seller : c.buyer;
          const otherName =
            other?.business_name || other?.full_name || "Unknown user";
          return (
            <button
              key={c.id}
              onClick={() =>
                setActive({
                  listingId: c.listing_id,
                  listingTitle: c.listing?.title || "Listing",
                  otherPartyName: otherName,
                  conversationId: c.id,
                })
              }
              className="w-full flex items-center gap-3 bg-surface border border-app rounded-xl px-4 py-3.5 text-left hover:bg-surface-2 transition-all"
            >
              <div className="w-10 h-10 rounded-full bg-brand-soft grid place-items-center shrink-0 font-bold text-sm text-brand">
                {otherName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-semibold text-main truncate">
                    {otherName}
                  </p>
                  {c.status === "closed" && (
                    <Lock size={11} className="text-faint shrink-0" />
                  )}
                </div>
                <p className="text-xs text-faint truncate">
                  {c.listing?.title || "Listing"}
                </p>
              </div>
              <span className="text-[10px] text-faint shrink-0">
                {timeAgo(c.last_message_at)}
              </span>
            </button>
          );
        })
      )}

      {active && (
        <ChatPanel
          open={!!active}
          onClose={() => setActive(null)}
          listingId={active.listingId}
          listingTitle={active.listingTitle}
          currentUserId={user.id}
          otherPartyName={active.otherPartyName}
          conversationId={active.conversationId}
        />
      )}
    </div>
  );
}
