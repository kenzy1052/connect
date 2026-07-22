import { useState, useRef, useEffect } from "react";
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
import { useToast } from "../../context/ToastContext";

const QUICK_EMOJIS = [
  "😀",
  "😂",
  "😍",
  "🥰",
  "😎",
  "🤔",
  "😅",
  "😭",
  "🙏",
  "👍",
  "👋",
  "❤️",
  "🔥",
  "✅",
  "💯",
  "🎉",
  "😊",
  "🤣",
  "😢",
  "😡",
  "🤝",
  "💪",
  "👏",
  "🥳",
  "😴",
  "😬",
  "🤯",
  "🤗",
  "😏",
  "🙄",
  "🫡",
  "💀",
  "🫶",
  "✨",
  "👀",
  "🎵",
  "😤",
  "🥹",
  "😻",
  "🫠",
];

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
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
  return d.toLocaleDateString([], {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function Avatar({ name, url, size = 42 }) {
  const initial = (name || "?").charAt(0).toUpperCase();
  return url ? (
    <img
      src={url}
      alt=""
      className="rounded-md object-cover shrink-0"
      style={{ width: size, height: size }}
    />
  ) : (
    <div
      className="rounded-md bg-brand/10 text-brand grid place-items-center font-bold shrink-0"
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
  const { label: presenceLabel, online } = useOtherPartyPresence(
    otherParty?.id,
  );
  const { blockedByMe, blockedByThem, block, unblock } = useBlockStatus(
    currentUserId,
    otherParty?.id,
  );
  const toast = useToast();
  const reportListingId = conversation?.listing_id || listingId;

  const [draft, setDraft] = useState(initialDraft || "");
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const rec = useVoiceRecorder();

  const [menuOpen, setMenuOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [reportOpen, setReportOpen] = useState(false);

  const menuRef = useRef(null);
  const emojiRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target))
        setMenuOpen(false);
      if (emojiRef.current && !emojiRef.current.contains(e.target))
        setEmojiOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

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

  const handleClearChat = () => {
    setMenuOpen(false);
    setConfirmAction({
      title: "Clear chat?",
      message: `All messages with ${otherParty?.name || "this user"} will be permanently deleted. This cannot be undone.`,
      variant: "danger",
      confirmLabel: "Clear chat",
      onConfirm: async () => {
        const { error: clearErr } = await clearMessages();
        if (clearErr) {
          toast.error(`Couldn't clear the chat: ${clearErr}`);
          return;
        }
        toast.success("Chat cleared");
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
        const { error: deleteErr } = await deleteConversation();
        if (deleteErr) {
          toast.error(`Couldn't delete the conversation: ${deleteErr}`);
          return;
        }
        toast.success("Conversation deleted");
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
    <div className="flex flex-col h-full bg-app min-h-0 w-full relative">
      {/* ── Top Navigation & Header ── */}
      <div className="flex items-center justify-between px-4 py-3 bg-surface shrink-0 z-20">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {onBack && (
            <button
              onClick={onBack}
              className="w-9 h-9 -ml-1 rounded-md flex items-center justify-center text-muted hover:text-main hover:bg-surface-2 transition-all shrink-0 sm:hidden"
              aria-label="Back"
            >
              <ArrowLeft size={18} />
            </button>
          )}

          <Link
            to={otherParty?.id ? `/seller/${otherParty.id}` : "#"}
            className="flex items-center gap-3 min-w-0 flex-1 group py-0.5 rounded-md transition-colors"
          >
            <div className="relative shrink-0">
              <Avatar
                name={otherParty?.name}
                url={otherParty?.avatarUrl}
                size={42}
              />
              {online && (
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs animate-pulse" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-main truncate group-hover:text-brand transition-colors leading-tight">
                {otherParty?.name || "Conversation"}
              </p>
              <p
                className={`text-[11px] font-medium truncate mt-0.5 ${online ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-faint"}`}
              >
                {presenceLabel}
              </p>
            </div>
          </Link>
        </div>

        {/* ── Three-Dot Menu (Right-Aligned) ── */}
        <div className="relative shrink-0 ml-2" ref={menuRef}>
          <button
            onClick={() => {
              setMenuOpen((o) => !o);
              setEmojiOpen(false);
            }}
            className={`w-9 h-9 rounded-md flex items-center justify-center transition-all ${
              menuOpen
                ? "bg-surface-2 text-main"
                : "text-muted hover:text-main hover:bg-surface-2"
            }`}
            aria-label="More options"
          >
            <MoreVertical size={18} />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-11 z-[200] w-56 bg-surface rounded-md shadow-xl overflow-hidden py-1.5 animate-in fade-in zoom-in-95 duration-150 origin-top-right">
              <MenuItem icon={<Eraser size={15} />} onClick={handleClearChat}>
                Clear chat
              </MenuItem>
              <div className="my-1 bg-surface-2 h-px w-full" />
              <MenuItem
                icon={<Trash size={15} />}
                onClick={handleDeleteChat}
                danger
              >
                Delete conversation
              </MenuItem>
              <MenuItem
                icon={
                  blockedByMe ? <UserCheck size={15} /> : <UserX size={15} />
                }
                onClick={handleBlockUser}
                danger={!blockedByMe}
              >
                {blockedByMe ? "Unblock user" : "Block user"}
              </MenuItem>
              <MenuItem icon={<Flag size={15} />} onClick={handleReport} danger>
                Report user
              </MenuItem>
            </div>
          )}
        </div>
      </div>

      {/* ── Messages Feed ── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-3 min-h-0 chat-scroll-thin bg-app"
      >
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center space-y-2">
            <div className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-faint font-medium">Loading history…</p>
          </div>
        ) : error ? (
          <div className="h-full flex items-center justify-center text-center px-6">
            <div className="p-4 rounded-md bg-[hsl(var(--danger)/0.08)] max-w-sm">
              <p className="text-xs text-[hsl(var(--danger))] font-medium">
                {error}
              </p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-6">
            <div className="w-14 h-14 rounded-md bg-surface-2 flex items-center justify-center text-faint">
              <MessageCircle size={28} strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-sm font-semibold text-main">
                Say hello to {otherParty?.name || "the seller"}! 👋
              </p>
              <p className="text-xs text-faint mt-1 max-w-xs">
                Ask about product availability, item condition, or arrange a
                secure meetup on campus.
              </p>
            </div>
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
              <div key={m.id} className="space-y-3">
                {showDateDivider && (
                  <div className="flex items-center justify-center my-4">
                    <span className="text-[10px] font-bold tracking-wider uppercase text-faint bg-surface-2 px-3 py-1 rounded-sm">
                      {formatDateLabel(m.created_at)}
                    </span>
                  </div>
                )}
                <div
                  className={`flex ${mine ? "justify-end" : "justify-start"} group/msg`}
                >
                  <div
                    className={
                      "max-w-[82%] sm:max-w-[72%] px-4 py-2.5 text-sm transition-all duration-150 " +
                      (mine
                        ? "bg-brand text-[hsl(var(--primary-fg))] rounded-md"
                        : "bg-surface text-main rounded-md shadow-2xs")
                    }
                  >
                    {isVoice ? (
                      <VoiceMessage
                        path={m.voice_path}
                        durationMs={m.voice_duration_ms}
                        mine={mine}
                      />
                    ) : (
                      <p className="whitespace-pre-wrap break-words leading-relaxed">
                        {m.body}
                      </p>
                    )}
                    <div
                      className={
                        "flex items-center gap-1.5 mt-1 select-none " +
                        (mine
                          ? "justify-end text-[hsl(var(--primary-fg))/0.8]"
                          : "justify-end text-faint")
                      }
                    >
                      <span className="text-[10px] font-medium tabular-nums">
                        {formatTime(m.created_at)}
                      </span>
                      {mine &&
                        (m.read_at ? (
                          <CheckCheck
                            size={14}
                            className="shrink-0 text-sky-300"
                          />
                        ) : online ? (
                          <CheckCheck
                            size={14}
                            className="shrink-0 opacity-80"
                          />
                        ) : (
                          <Check size={14} className="shrink-0 opacity-80" />
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Composer Area ── */}
      {blockedByMe ? (
        <div className="p-4 flex items-center justify-center gap-2.5 text-faint bg-surface shrink-0">
          <Ban size={15} className="text-[hsl(var(--danger))]" />
          <p className="text-xs font-medium">
            You blocked this user. Unblock them from the top right menu to
            resume messaging.
          </p>
        </div>
      ) : blockedByThem ? (
        <div className="p-4 flex items-center justify-center gap-2 text-faint bg-surface shrink-0">
          <Ban size={15} />
          <p className="text-xs font-medium">
            You can no longer reply to this conversation.
          </p>
        </div>
      ) : isClosed ? (
        <div className="p-4 flex items-center justify-center gap-2 text-faint bg-surface shrink-0">
          <Lock size={15} className="text-amber-500" />
          <p className="text-xs font-medium">
            This listing is closed or sold — conversation is archived.
          </p>
        </div>
      ) : rec.recording ? (
        <div className="flex items-center gap-3 p-3.5 bg-surface shrink-0 shadow-lg animate-in fade-in duration-150">
          <button
            type="button"
            onClick={cancelRec}
            className="w-10 h-10 shrink-0 rounded-md bg-surface-2 flex items-center justify-center text-[hsl(var(--danger))] hover:bg-[hsl(var(--danger)/0.1)] active:scale-95 transition-all"
            aria-label="Cancel recording"
          >
            <Trash2 size={18} />
          </button>
          <div className="flex-1 flex items-center gap-2.5 text-sm font-semibold text-main bg-surface-2 px-4 py-2 rounded-md">
            <span className="w-2.5 h-2.5 rounded-full bg-[hsl(var(--danger))] animate-pulse shrink-0" />
            <span className="tabular-nums tracking-wide">
              {fmtDur(rec.durationMs)}
            </span>
            <span className="text-faint text-xs font-normal">
              Recording voice note…
            </span>
          </div>
          <button
            type="button"
            onClick={stopRec}
            className="w-10 h-10 shrink-0 rounded-md bg-brand text-[hsl(var(--primary-fg))] flex items-center justify-center shadow-md hover:brightness-110 active:scale-95 transition-all"
            aria-label="Send voice message"
          >
            <Send size={16} />
          </button>
        </div>
      ) : (
        <div className="relative bg-surface shrink-0 p-3">
          {/* Quick Emoji Popover */}
          {emojiOpen && (
            <div
              ref={emojiRef}
              className="absolute bottom-full left-3 mb-2 z-[200] bg-surface rounded-md shadow-xl p-3 w-72 animate-in fade-in zoom-in-95 duration-150"
            >
              <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto chat-scroll-thin p-1">
                {QUICK_EMOJIS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => insertEmoji(e)}
                    className="text-xl w-8 h-8 flex items-center justify-center rounded-sm hover:bg-surface-2 hover:scale-110 active:scale-95 transition-all"
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          )}

          <form
            onSubmit={handleSend}
            className="flex items-end gap-2 max-w-5xl mx-auto"
          >
            <button
              type="button"
              onClick={() => {
                setEmojiOpen((o) => !o);
                setMenuOpen(false);
              }}
              className={
                "w-10 h-10 shrink-0 rounded-md flex items-center justify-center transition-all mb-0.5 " +
                (emojiOpen
                  ? "bg-brand text-[hsl(var(--primary-fg))]"
                  : "text-muted hover:text-main hover:bg-surface-2")
              }
              aria-label="Emoji"
            >
              <Smile size={20} />
            </button>

            <div className="flex-1 relative">
              <input
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Type a message…"
                maxLength={2000}
                className="w-full bg-surface-2 hover:bg-surface-2/90 focus:bg-surface-2 rounded-md px-4 py-2.5 text-sm text-main placeholder:text-faint outline-none transition-all duration-150"
              />
            </div>

            {draft.trim() ? (
              <button
                type="submit"
                disabled={sending}
                className="w-10 h-10 shrink-0 rounded-md bg-brand text-[hsl(var(--primary-fg))] flex items-center justify-center shadow-md disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 active:scale-95 transition-all mb-0.5"
                aria-label="Send"
              >
                <Send size={16} className="ml-0.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={startRec}
                className="w-10 h-10 shrink-0 rounded-md bg-surface-2 text-main hover:bg-brand hover:text-[hsl(var(--primary-fg))] flex items-center justify-center transition-all mb-0.5 active:scale-95"
                aria-label="Record voice message"
              >
                <Mic size={18} />
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

function MenuItem({ icon, onClick, danger = false, children }) {
  return (
    <button
      onClick={onClick}
      className={
        "w-full flex items-center justify-end gap-3 px-4 py-2.5 text-xs font-semibold tracking-wide text-right transition-colors " +
        (danger
          ? "text-[hsl(var(--danger))] hover:bg-[hsl(var(--danger)/0.08)]"
          : "text-main hover:bg-surface-2")
      }
    >
      <span>{children}</span>
      <span className="shrink-0 opacity-70">{icon}</span>
    </button>
  );
}
