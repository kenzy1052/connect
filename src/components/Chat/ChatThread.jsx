import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Send,
  MessageCircle,
  Lock,
  Check,
  CheckCheck,
  Mic,
  Trash2,
  MoreVertical,
  Smile,
  Eraser,
  Trash,
  UserX,
  UserCheck,
  Flag,
  Ban,
} from "lucide-react";
import { useConversation, useBlockStatus } from "../../hooks/useConversation";
import { useOtherPartyPresence } from "../../hooks/usePresence";
import { useVoiceRecorder } from "../../hooks/useVoiceRecorder";
import VoiceMessage from "./VoiceMessage";
import ConfirmModal from "../UI/ConfirmModal";
import ReportUserModal from "./ReportUserModal";

// Common emojis shown in the quick picker
const QUICK_EMOJIS = [
  "😀","😂","😍","🥰","😎","🤔","😅","😭","🙏","👍",
  "👋","❤️","🔥","✅","💯","🎉","😊","🤣","😢","😡",
  "🤝","💪","👏","🥳","😴","😬","🤯","🤗","😏","🙄",
  "🫡","💀","🫶","✨","👀","🎵","😤","🥹","😻","🫠",
];

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatDateLabel(iso) {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return "Today";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  const daysAgo = Math.floor((now - d) / 86_400_000);
  if (daysAgo < 7) return d.toLocaleDateString([], { weekday: "long" });
  return d.toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" });
}

function Avatar({ name, url, size = 40 }) {
  const initial = (name || "?").charAt(0).toUpperCase();
  return url ? (
    <img
      src={url}
      alt=""
      className="rounded-full object-cover shrink-0"
      style={{ width: size, height: size }}
    />
  ) : (
    <div
      className="rounded-full bg-brand-soft text-brand grid place-items-center font-bold shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initial}
    </div>
  );
}

function fmtDur(ms) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * WhatsApp-style thread pane.
 *
 * Props:
 *   listingId        — UUID of the listing this chat relates to
 *   currentUserId    — auth user's id
 *   otherParty       — { id, name, avatarUrl }
 *   conversationId   — null when starting a brand-new chat
 *   initialDraft     — pre-filled text (from "Message Seller" CTA on a listing)
 *   onBack           — called on mobile back button tap
 */
export default function ChatThread({
  listingId,
  currentUserId,
  otherParty,
  conversationId = null,
  initialDraft = null,
  onBack,
}) {
  const {
    conversation,
    messages,
    loading,
    sending,
    error,
    sendMessage,
    sendVoice,
    clearMessages,
    deleteConversation,
    isClosed,
  } = useConversation({
    listingId,
    currentUserId,
    conversationId,
    sellerId: otherParty?.id,
    enabled: true,
  });
  const { label: presenceLabel, online } = useOtherPartyPresence(otherParty?.id);
  const { blockedByMe, blockedByThem, block, unblock } = useBlockStatus(
    currentUserId,
    otherParty?.id,
  );
  const reportListingId = conversation?.listing_id || listingId;

  // Draft text — seeded with initialDraft when coming from a listing CTA
  const [draft, setDraft] = useState(initialDraft || "");
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const rec = useVoiceRecorder();

  // Dropdown states
  const [menuOpen, setMenuOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); // { title, message, variant, confirmLabel, onConfirm }
  const [reportOpen, setReportOpen] = useState(false);

  // Ref targets for outside-click dismissal
  const menuRef = useRef(null);
  const emojiRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
      if (emojiRef.current && !emojiRef.current.contains(e.target)) setEmojiOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!draft.trim() || isClosed) return;
    const text = draft;
    setDraft("");
    setEmojiOpen(false);
    const { error: sendErr } = await sendMessage(text);
    if (sendErr) setDraft(text);
  };

  const insertEmoji = (emoji) => {
    setDraft((d) => d + emoji);
    setEmojiOpen(false);
    inputRef.current?.focus();
  };

  const startRec = async (e) => {
    e.preventDefault();
    if (isClosed || sending) return;
    await rec.start();
  };

  const stopRec = async (e) => {
    e.preventDefault();
    const result = await rec.stop();
    if (result?.blob && result.durationMs > 500) {
      await sendVoice(result.blob, result.durationMs);
    }
  };

  const cancelRec = () => rec.cancel();

  // ── Three-dot menu actions ──────────────────────────────────────────────
  const handleClearChat = () => {
    setMenuOpen(false);
    setConfirmAction({
      title: "Clear chat?",
      message: `All messages with ${otherParty?.name || "this user"} will be permanently deleted. This cannot be undone.`,
      variant: "danger",
      confirmLabel: "Clear chat",
      onConfirm: async () => {
        await clearMessages();
        onBack?.();
      },
    });
  };

  const handleDeleteChat = () => {
    setMenuOpen(false);
    setConfirmAction({
      title: "Delete conversation?",
      message: `This will permanently delete your entire conversation with ${otherParty?.name || "this user"}. This cannot be undone.`,
      variant: "danger",
      confirmLabel: "Delete",
      onConfirm: async () => {
        await deleteConversation();
        onBack?.();
      },
    });
  };

  const handleBlockUser = () => {
    setMenuOpen(false);
    if (blockedByMe) {
      setConfirmAction({
        title: "Unblock user?",
        message: `${otherParty?.name || "This user"} will be able to message you again.`,
        variant: "warning",
        confirmLabel: "Unblock",
        onConfirm: () => unblock(),
      });
      return;
    }
    setConfirmAction({
      title: "Block user?",
      message: `${otherParty?.name || "This user"} won't be able to send you messages anymore. You can unblock them later from this menu.`,
      variant: "danger",
      confirmLabel: "Block",
      onConfirm: () => block(),
    });
  };

  const handleReport = () => {
    setMenuOpen(false);
    setReportOpen(true);
  };

  return (
    <div className="flex flex-col h-full bg-app min-h-0 w-full">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-3 sm:px-4 py-3 border-b border-app bg-surface shrink-0">
        {/* Mobile back button */}
        {onBack && (
          <button
            onClick={onBack}
            className="w-8 h-8 -ml-1 rounded-full grid place-items-center text-muted hover:text-main hover:bg-surface-2 transition-all shrink-0 sm:hidden"
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </button>
        )}

        {/* Avatar + name + presence — clicking navigates to seller profile */}
        <Link
          to={otherParty?.id ? `/seller/${otherParty.id}` : "#"}
          className="flex items-center gap-3 min-w-0 flex-1 group"
        >
          <div className="relative shrink-0">
            <Avatar name={otherParty?.name} url={otherParty?.avatarUrl} />
            {online && (
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-surface" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-main truncate group-hover:text-brand transition-colors">
              {otherParty?.name || "Conversation"}
            </p>
            <p className="text-[11px] text-faint truncate">{presenceLabel}</p>
          </div>
        </Link>

        {/* ── Three-dot menu ── */}
        <div className="relative shrink-0" ref={menuRef}>
          <button
            onClick={() => { setMenuOpen((o) => !o); setEmojiOpen(false); }}
            className="w-9 h-9 rounded-full grid place-items-center text-muted hover:text-main hover:bg-surface-2 transition-all"
            aria-label="More options"
          >
            <MoreVertical size={18} />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-11 z-[200] w-52 bg-surface border border-app rounded-xl shadow-2xl overflow-hidden py-1">
              <MenuItem icon={<Eraser size={15} />} onClick={handleClearChat}>
                Clear chat
              </MenuItem>
              <div className="my-1 border-t border-app" />
              <MenuItem
                icon={<Trash size={15} />}
                onClick={handleDeleteChat}
                danger
              >
                Delete conversation
              </MenuItem>
              <MenuItem
                icon={blockedByMe ? <UserCheck size={15} /> : <UserX size={15} />}
                onClick={handleBlockUser}
                danger={!blockedByMe}
              >
                {blockedByMe ? "Unblock user" : "Block user"}
              </MenuItem>
              <MenuItem
                icon={<Flag size={15} />}
                onClick={handleReport}
                danger
              >
                Report user
              </MenuItem>
            </div>
          )}
        </div>
      </div>

      {/* ── Messages ───────────────────────────────────────────────────── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 space-y-2 min-h-0"
      >
        {loading ? (
          <div className="h-full grid place-items-center">
            <p className="text-xs text-faint">Loading conversation…</p>
          </div>
        ) : error ? (
          <div className="h-full grid place-items-center text-center px-6">
            <p className="text-xs text-[hsl(var(--danger))]">{error}</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-center px-6">
            <MessageCircle size={28} className="text-faint" />
            <p className="text-xs text-faint">Say hello 👋</p>
          </div>
        ) : (
          messages.map((m, i) => {
            const mine = m.sender_id === currentUserId;
            const prev = messages[i - 1];
            const showDateDivider =
              !prev ||
              new Date(prev.created_at).toDateString() !==
                new Date(m.created_at).toDateString();
            const isVoice = !!m.voice_path;

            return (
              <div key={m.id}>
                {showDateDivider && (
                  <div className="flex items-center justify-center my-3">
                    <span className="text-[10px] font-semibold text-faint bg-surface-2 px-2.5 py-1 rounded-full">
                      {formatDateLabel(m.created_at)}
                    </span>
                  </div>
                )}
                <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={
                      "max-w-[78%] rounded-2xl px-3 py-2 text-sm shadow-sm " +
                      (mine
                        ? "bg-brand text-[hsl(var(--primary-fg))] rounded-br-md"
                        : "bg-surface text-main rounded-bl-md border border-app")
                    }
                  >
                    {isVoice ? (
                      <VoiceMessage
                        path={m.voice_path}
                        durationMs={m.voice_duration_ms}
                        mine={mine}
                      />
                    ) : (
                      <p className="whitespace-pre-wrap break-words">{m.body}</p>
                    )}
                    <div
                      className={
                        "flex items-center gap-1 mt-1 " +
                        (mine ? "justify-end opacity-80" : "text-faint")
                      }
                    >
                      <span className="text-[10px]">{formatTime(m.created_at)}</span>
                      {mine &&
                        (m.read_at ? (
                          <CheckCheck size={13} className="shrink-0 text-sky-300" />
                        ) : online ? (
                          <CheckCheck size={13} className="shrink-0" />
                        ) : (
                          <Check size={13} className="shrink-0" />
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Composer ───────────────────────────────────────────────────── */}
      {blockedByMe ? (
        <div className="px-4 py-3.5 border-t border-app flex items-center gap-2 text-faint shrink-0 bg-surface">
          <Ban size={13} />
          <p className="text-xs">
            You've blocked {otherParty?.name || "this user"}. Unblock them to send messages.
          </p>
        </div>
      ) : blockedByThem ? (
        <div className="px-4 py-3.5 border-t border-app flex items-center gap-2 text-faint shrink-0 bg-surface">
          <Ban size={13} />
          <p className="text-xs">You can't reply to this conversation.</p>
        </div>
      ) : isClosed ? (
        <div className="px-4 py-3.5 border-t border-app flex items-center gap-2 text-faint shrink-0 bg-surface">
          <Lock size={13} />
          <p className="text-xs">This listing has been sold — the conversation is closed.</p>
        </div>
      ) : rec.recording ? (
        /* Recording in progress */
        <div className="flex items-center gap-3 px-3 py-3 border-t border-app shrink-0 bg-surface">
          <button
            type="button"
            onClick={cancelRec}
            className="w-10 h-10 shrink-0 rounded-full bg-surface-2 grid place-items-center text-[hsl(var(--danger))] hover:brightness-110 active:scale-95 transition-all"
            aria-label="Cancel recording"
          >
            <Trash2 size={16} />
          </button>
          <div className="flex-1 flex items-center gap-2 text-sm text-main">
            <span className="w-2.5 h-2.5 rounded-full bg-[hsl(var(--danger))] animate-pulse" />
            <span className="tabular-nums">{fmtDur(rec.durationMs)}</span>
            <span className="text-faint text-xs">Recording…</span>
          </div>
          <button
            type="button"
            onClick={stopRec}
            className="w-10 h-10 shrink-0 rounded-full bg-brand grid place-items-center hover:brightness-110 active:scale-95 transition-all"
            aria-label="Send voice message"
          >
            <Send size={15} />
          </button>
        </div>
      ) : (
        /* Normal composer */
        <div className="relative border-t border-app bg-surface shrink-0">
          {/* Emoji picker popover */}
          {emojiOpen && (
            <div
              ref={emojiRef}
              className="absolute bottom-full left-0 mb-2 ml-2 z-[200] bg-surface border border-app rounded-2xl shadow-2xl p-3 w-72"
            >
              <div className="grid grid-cols-8 gap-1">
                {QUICK_EMOJIS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => insertEmoji(e)}
                    className="text-xl w-8 h-8 grid place-items-center rounded-lg hover:bg-surface-2 transition-colors"
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          )}

          <form
            onSubmit={handleSend}
            className="flex items-center gap-2 px-3 py-3"
          >
            {/* Emoji toggle */}
            <button
              type="button"
              onClick={() => { setEmojiOpen((o) => !o); setMenuOpen(false); }}
              className={
                "w-9 h-9 shrink-0 rounded-full grid place-items-center transition-all " +
                (emojiOpen
                  ? "bg-brand text-[hsl(var(--primary-fg))]"
                  : "text-muted hover:text-main hover:bg-surface-2")
              }
              aria-label="Emoji"
            >
              <Smile size={18} />
            </button>

            {/* Text input */}
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Type a message…"
              maxLength={2000}
              className="flex-1 bg-surface-2 border border-app rounded-full px-4 py-2.5 text-sm text-main placeholder:text-faint outline-none focus:border-[hsl(var(--primary))] transition-all"
            />

            {/* Send / Mic */}
            {draft.trim() ? (
              <button
                type="submit"
                disabled={sending}
                className="w-10 h-10 shrink-0 rounded-full bg-brand grid place-items-center disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 active:scale-95 transition-all"
                aria-label="Send"
              >
                <Send size={15} />
              </button>
            ) : (
              <button
                type="button"
                onClick={startRec}
                className="w-10 h-10 shrink-0 rounded-full bg-brand grid place-items-center hover:brightness-110 active:scale-95 transition-all"
                aria-label="Record voice message"
              >
                <Mic size={16} />
              </button>
            )}
          </form>
        </div>
      )}

      {confirmAction && (
        <ConfirmModal
          {...confirmAction}
          onClose={() => setConfirmAction(null)}
        />
      )}

      {reportOpen && (
        <ReportUserModal
          otherUserId={otherParty?.id}
          otherUserName={otherParty?.name}
          listingId={reportListingId}
          onClose={() => setReportOpen(false)}
        />
      )}
    </div>
  );
}

/** Small helper for the three-dot dropdown rows */
function MenuItem({ icon, onClick, danger = false, children }) {
  return (
    <button
      onClick={onClick}
      className={
        "w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors " +
        (danger
          ? "text-[hsl(var(--danger))] hover:bg-[hsl(var(--danger)/0.08)]"
          : "text-main hover:bg-surface-2")
      }
    >
      <span className="shrink-0 opacity-70">{icon}</span>
      {children}
    </button>
  );
}
