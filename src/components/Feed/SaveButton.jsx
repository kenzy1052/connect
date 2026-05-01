import { useEffect, useState } from "react";
import { Bookmark, Heart } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { useRequireAuth } from "../../hooks/useRequireAuth";

export default function SaveButton({
  listingId,
  className = "",
  variant = "icon", // "icon" | "pill"
}) {
  const { user } = useAuth();
  const requireAuth = useRequireAuth();

  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  // Check if listing is already saved (only if user is logged in)
  useEffect(() => {
    if (!user || !listingId) {
      setSaved(false); // Reset state if user logs out
      return;
    }

    let cancelled = false;
    supabase
      .from("saved_listings")
      .select("listing_id")
      .eq("user_id", user.id)
      .eq("listing_id", listingId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setSaved(!!data);
      });

    return () => {
      cancelled = true;
    };
  }, [user, listingId]);

  // Only return null if there is no listingId.
  // We want guests to see the button!
  if (!listingId) return null;

  const toggle = async (e) => {
    e.stopPropagation();

    // --- AUTH GATE ---
    // If guest, this will redirect to /signin and return false
    if (!requireAuth()) return;

    if (busy) return;
    setBusy(true);

    const next = !saved;
    setSaved(next); // optimistic update

    const op = next
      ? supabase
          .from("saved_listings")
          .insert({ user_id: user.id, listing_id: listingId })
      : supabase
          .from("saved_listings")
          .delete()
          .eq("user_id", user.id)
          .eq("listing_id", listingId);

    const { error } = await op;
    if (error) {
      console.error("Error toggling save:", error.message);
      setSaved(!next); // rollback on error
    }
    setBusy(false);
  };

  // ── Render Pill Variant ──────────────────────────────────────────────────
  if (variant === "pill") {
    return (
      <button
        onClick={toggle}
        disabled={busy}
        className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all active:scale-95 ${
          saved
            ? "bg-indigo-600/15 border-indigo-500/40 text-indigo-300"
            : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
        } ${className}`}
        aria-pressed={saved}
      >
        <Bookmark
          size={14}
          className={saved ? "fill-indigo-400 text-indigo-400" : ""}
        />
        {saved ? "Saved" : "Save"}
      </button>
    );
  }

  // ── Render Heart Variant (premium card overlay) ─────────────────────────
  if (variant === "heart") {
    return (
      <button
        onClick={toggle}
        disabled={busy}
        className={`grid place-items-center w-9 h-9 rounded-full bg-black/45 backdrop-blur-md
                    hover:bg-black/65 transition-all active:scale-90 ${className}`}
        aria-label={saved ? "Remove from saved" : "Save listing"}
        aria-pressed={saved}
      >
        <Heart
          size={16}
          className={saved ? "fill-rose-500 text-rose-500" : "text-white"}
        />
      </button>
    );
  }

  // ── Render Icon Variant ──────────────────────────────────────────────────
  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`p-2 rounded-full bg-black/60 backdrop-blur-sm hover:bg-black/80 transition-all ${className}`}
      aria-label={saved ? "Remove from saved" : "Save listing"}
      aria-pressed={saved}
    >
      <Bookmark
        size={18}
        className={saved ? "fill-indigo-400 text-indigo-400" : "text-white"}
      />
    </button>
  );
}
