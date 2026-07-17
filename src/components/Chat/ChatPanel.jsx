import { useState, useRef, useEffect } from "react";
import { X, Send, MessageCircle, Lock } from "lucide-react";
import { useConversation } from "../../hooks/useConversation";

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/**
 * Slide-over chat panel for one listing-scoped conversation.
 *
 * Used from two entry points:
 *   1. ListingDetail.jsx "Message Seller" button (buyer side — creates or
 *      resumes the conversation for that listing automatically).
 *   2. MessagesTab.jsx inbox (either side — passes an existing conversationId
 *      via listingId + already-known participant, same hook handles both
 *      since a conversation is uniquely identified by listing_id + buyer_id).
 */
export default function ChatPanel({
  open,
  onClose,
  listingId,
  listingTitle,
  currentUserId,
  otherPartyName,
  conversationId = null,
}) {
  const { conversation, messages, loading, sending, error, sendMessage, isClosed } =
    useConversation({ listingId, currentUserId, conversationId, enabled: open });
  const [draft, setDraft] = useState("");
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, open]);

  if (!open) return null;

  const handleSend = async (e) => {
    e.preventDefault();
    if (!draft.trim() || isClosed) return;
    const text = draft;
    setDraft("");
    const { error: sendErr } = await sendMessage(text);
    if (sendErr) setDraft(text); // restore on failure so nothing is lost
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full sm:max-w-md h-[85vh] sm:h-[600px] bg-surface border border-app rounded-t-2xl sm:rounded-2xl flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-app shrink-0">
          <div className="min-w-0">
            <p className="text-sm font-bold text-main truncate">
              {otherPartyName || "Conversation"}
            </p>
            <p className="text-[11px] text-faint truncate">{listingTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full grid place-items-center bg-surface-2 hover:bg-surface-3 text-muted hover:text-main transition-all shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {loading ? (
            <div className="h-full grid place-items-center">
              <p className="text-xs text-faint">Loading conversation…</p>
            </div>
          ) : error ? (
            <div className="h-full grid place-items-center text-center px-6">
              <p className="text-xs text-red-400">{error}</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-center px-6">
              <MessageCircle size={28} className="text-faint" />
              <p className="text-xs text-faint">
                No messages yet — say hello about "{listingTitle}"
              </p>
            </div>
          ) : (
            messages.map((m) => {
              const mine = m.sender_id === currentUserId;
              return (
                <div
                  key={m.id}
                  className={`flex ${mine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={
                      "max-w-[75%] rounded-2xl px-3.5 py-2 text-sm " +
                      (mine
                        ? "bg-brand rounded-br-sm"
                        : "bg-surface-2 text-main rounded-bl-sm")
                    }
                  >
                    <p className="whitespace-pre-wrap break-words">{m.body}</p>
                    <p
                      className={
                        "text-[10px] mt-1 " + (mine ? "opacity-70" : "text-faint")
                      }
                    >
                      {formatTime(m.created_at)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Composer */}
        {isClosed ? (
          <div className="px-4 py-3.5 border-t border-app flex items-center gap-2 text-faint shrink-0">
            <Lock size={13} />
            <p className="text-xs">
              This listing has been sold — the conversation is closed.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSend}
            className="flex items-center gap-2 px-3 py-3 border-t border-app shrink-0"
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Type a message…"
              maxLength={2000}
              className="flex-1 bg-app border border-app rounded-full px-4 py-2.5 text-sm text-main placeholder:text-faint outline-none focus:border-[hsl(var(--primary))] transition-all"
            />
            <button
              type="submit"
              disabled={!draft.trim() || sending}
              className="w-10 h-10 shrink-0 rounded-full bg-brand grid place-items-center disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 active:scale-95 transition-all"
            >
              <Send size={15} />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
