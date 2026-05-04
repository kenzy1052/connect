import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { ExternalLink, X } from "lucide-react";

/**
 * AdBanner — fetches a single active ad from the `ads` table and renders it
 * as a dismissable banner in the feed.
 *
 * To add a new ad:
 *   1. Go to Supabase → Table Editor → ads
 *   2. Insert a row:
 *      - title: short headline (e.g. "50% off Graphic Design services")
 *      - body: supporting text (optional)
 *      - cta_url: where clicking the ad should go (can be internal /path or external URL)
 *      - image_url: Cloudinary/Supabase image URL (optional but recommended)
 *      - is_active: true
 *      - starts_at: now
 *      - ends_at: when you want it to expire (or leave null for indefinite)
 *   3. The banner will appear automatically on the feed page.
 *
 * Slot key "feed-top" is the default. You can use different slot_key values
 * to show different ads in different parts of the UI by rendering
 * <AdBanner slot="your-key" /> where you want it.
 */
export default function AdBanner({ slot = "feed-top" }) {
  const [ad, setAd] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Check if this ad slot was dismissed in this session
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

      if (!error && data) {
        setAd(data);
      }
      setLoaded(true);
    };

    fetchAd();
  }, [slot]);

  const handleDismiss = () => {
    sessionStorage.setItem(`ad_dismissed_${slot}`, "1");
    setDismissed(true);

    // Log dismiss event (fire-and-forget)
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

  const content = (
    <div className="flex items-center gap-3 flex-1 min-w-0">
      {ad.image_url && (
        <img
          src={ad.image_url}
          alt=""
          className="w-12 h-12 rounded-lg object-cover shrink-0 border border-app"
        />
      )}
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
