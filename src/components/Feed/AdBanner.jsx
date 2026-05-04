import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { ExternalLink, X } from "lucide-react";

/**
 * AdBanner — fetches a single active ad from the `ads` table and renders it
 * as a dismissable banner in the feed.
 */
export default function AdBanner({ slot = "feed-top" }) {
  console.log("🔥 AdBanner is attempting to mount with slot:", slot); // HEARTBEAT LOG

  const [ad, setAd] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const key = `ad_dismissed_${slot}`;
    if (sessionStorage.getItem(key)) {
      setDismissed(true);
      return;
    }

    const fetchAd = async () => {
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from("ads")
        .select("*")
        .eq("is_active", true)
        .or(`slot_key.eq.${slot},slot_key.is.null`)
        .or(`ends_at.is.null,ends_at.gt.${now}`)
        .lte("starts_at", now)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      // --- DEBUGGING LOGS ---
      if (error) {
        console.error(
          `[AdBanner Debug] Error fetching for slot "${slot}":`,
          error.message,
        );
      } else if (!data) {
        console.warn(`[AdBanner Debug] No active ad found for slot "${slot}".`);
      } else {
        console.log(`[AdBanner Debug] Ad loaded successfully:`, data);
      }
      // ----------------------

      if (!error && data) setAd(data);
      setLoaded(true);
    };

    fetchAd();
  }, [slot]);

  const handleDismiss = () => {
    sessionStorage.setItem(`ad_dismissed_${slot}`, "1");
    setDismissed(true);
    if (ad?.id) {
      supabase.from("ad_events").insert({
        ad_id: ad.id,
        slot_key: slot,
        kind: "dismiss",
      });
    }
  };

  const handleClick = () => {
    if (ad?.id) {
      supabase.from("ad_events").insert({
        ad_id: ad.id,
        slot_key: slot,
        kind: "click",
      });
    }
  };

  if (!loaded || dismissed || !ad) return null;

  const isExternal =
    ad.cta_url &&
    (ad.cta_url.startsWith("http://") || ad.cta_url.startsWith("https://"));

  // Media Logic: Video takes priority over Image
  const media = ad.video_url ? (
    <video
      src={ad.video_url}
      autoPlay
      muted
      loop
      playsInline
      className="w-16 h-12 rounded-lg object-cover shrink-0 border border-app"
    />
  ) : ad.image_url ? (
    <img
      src={ad.image_url}
      alt=""
      className="w-12 h-12 rounded-lg object-cover shrink-0 border border-app"
    />
  ) : null;

  const content = (
    <div className="flex items-center gap-3 flex-1 min-w-0">
      {media}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[9px] font-black uppercase tracking-widest text-faint bg-surface-2 border border-app px-1.5 py-0.5 rounded">
            Sponsored
          </span>
          <span className="text-sm font-bold text-main truncate">
            {ad.title}
          </span>
        </div>
        {ad.body && (
          <p className="text-xs text-muted mt-0.5 line-clamp-1">{ad.body}</p>
        )}
      </div>
      {ad.cta_url && (
        <span className="shrink-0 flex items-center gap-1 text-xs font-semibold text-brand hover:underline">
          {isExternal ? <ExternalLink size={12} /> : null}
          Learn more
        </span>
      )}
    </div>
  );

  return (
    <div className="mb-5 rounded-xl border border-app bg-surface overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center gap-3 px-4 py-3">
        {ad.cta_url ? (
          <a
            href={ad.cta_url}
            target={isExternal ? "_blank" : "_self"}
            rel={isExternal ? "noopener noreferrer" : undefined}
            onClick={handleClick}
            className="flex-1 flex items-center gap-3 min-w-0 hover:opacity-80 transition-opacity"
          >
            {content}
          </a>
        ) : (
          <div className="flex-1 flex items-center gap-3 min-w-0">
            {content}
          </div>
        )}
        <button
          onClick={handleDismiss}
          className="shrink-0 p-1.5 rounded-lg text-faint hover:text-main hover:bg-surface-2 transition-colors"
          aria-label="Dismiss ad"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
