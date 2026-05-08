import { useEffect, useState, useRef } from "react";
import { supabase } from "../../lib/supabaseClient";
import { ExternalLink, X } from "lucide-react";

/**
 * AdBanner — fetches active ads for a given slot and renders them with:
 *  - A 5-second countdown before the dismiss button appears
 *  - Impression tracking on mount
 *  - Click tracking on CTA
 *  - Rotation through multiple ads (cycles via index)
 *  - Optional `interstitial` slot = full-screen overlay with skip timer
 */
export default function AdBanner({ slot = "feed-top", compact = false }) {
  const [ads, setAds] = useState([]);
  const [adIndex, setAdIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [canClose, setCanClose] = useState(false);
  const impressionTracked = useRef(false);

  const isInterstitial = slot === "interstitial";
  const sessionKey = `ad_dismissed_${slot}`;

  // ── Fetch ads for this slot ──────────────────────────────────────────────
  useEffect(() => {
    if (sessionStorage.getItem(sessionKey)) {
      setDismissed(true);
      setLoaded(true);
      return;
    }

    async function fetchAds() {
      const now = new Date().toISOString();
      const { data } = await supabase
        .from("ads")
        .select("*")
        .eq("is_active", true)
        .or(`slot_key.eq.${slot},slot_key.is.null`)
        .or(`ends_at.is.null,ends_at.gt.${now}`)
        .lte("starts_at", now)
        .order("priority", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(5); // fetch up to 5 to rotate through

      setAds(data || []);
      setLoaded(true);
    }
    fetchAds();
  }, [slot, sessionKey]);

  const ad = ads[adIndex] || null;

  // ── Track impression + start countdown when ad is ready ─────────────────
  useEffect(() => {
    if (!ad || dismissed || impressionTracked.current) return;
    impressionTracked.current = true;

    // Track impression
    supabase.from("ad_events").insert({ ad_id: ad.id, slot_key: slot, kind: "impression" });

    // Start 5-second countdown
    setCountdown(5);
    setCanClose(false);
    let count = 5;
    const timer = setInterval(() => {
      count -= 1;
      setCountdown(count);
      if (count <= 0) {
        setCanClose(true);
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [ad, dismissed, slot]);

  // ── Rotate to next ad every 15s (only if multiple ads) ──────────────────
  useEffect(() => {
    if (ads.length <= 1 || dismissed) return;
    const rotator = setInterval(() => {
      impressionTracked.current = false;
      setAdIndex((i) => (i + 1) % ads.length);
    }, 15000);
    return () => clearInterval(rotator);
  }, [ads.length, dismissed]);

  const handleDismiss = () => {
    sessionStorage.setItem(sessionKey, "1");
    setDismissed(true);
    if (ad?.id) supabase.from("ad_events").insert({ ad_id: ad.id, slot_key: slot, kind: "dismiss" });
  };

  const handleClick = () => {
    if (ad?.id) supabase.from("ad_events").insert({ ad_id: ad.id, slot_key: slot, kind: "click" });
  };

  if (!loaded || dismissed || !ad) return null;

  const isExternal = ad.cta_url?.startsWith("http");

  const media = ad.video_url ? (
    <video
      src={ad.video_url}
      autoPlay muted loop playsInline
      className={`rounded-lg object-cover shrink-0 border border-app ${compact ? "w-12 h-9" : "w-16 h-12"}`}
    />
  ) : ad.image_url ? (
    <img
      src={ad.image_url} alt=""
      className={`rounded-lg object-cover shrink-0 border border-app ${compact ? "w-10 h-10" : "w-12 h-12"}`}
    />
  ) : null;

  const CloseButton = () => (
    <button
      onClick={handleDismiss}
      disabled={!canClose}
      className="shrink-0 relative flex items-center justify-center w-7 h-7 rounded-full transition-all"
      style={{ background: canClose ? "rgba(255,255,255,0.08)" : "transparent" }}
      aria-label={canClose ? "Dismiss ad" : `Skip in ${countdown}s`}
    >
      {canClose ? (
        <X size={13} className="text-faint hover:text-main transition-colors" />
      ) : (
        <span className="text-[10px] font-black text-faint tabular-nums select-none">
          {countdown}
        </span>
      )}
      {/* Countdown ring */}
      {!canClose && (
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 28 28">
          <circle cx="14" cy="14" r="12" fill="none" stroke="currentColor"
            strokeWidth="2" className="text-app opacity-30" />
          <circle cx="14" cy="14" r="12" fill="none" stroke="currentColor"
            strokeWidth="2" className="text-brand"
            strokeDasharray={`${2 * Math.PI * 12}`}
            strokeDashoffset={`${2 * Math.PI * 12 * (countdown / 5)}`}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 1s linear" }}
          />
        </svg>
      )}
    </button>
  );

  // ── Interstitial (full-screen overlay) ──────────────────────────────────
  if (isInterstitial) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
        <div className="relative w-full max-w-lg mx-4 bg-surface rounded-3xl border border-app overflow-hidden shadow-2xl">
          {ad.image_url && (
            <img src={ad.image_url} alt="" className="w-full h-56 object-cover" />
          )}
          <div className="p-6">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-faint">Sponsored</span>
                <h3 className="text-xl font-black text-main mt-0.5">{ad.title}</h3>
              </div>
              <CloseButton />
            </div>
            {ad.body && <p className="text-sm text-muted mb-5">{ad.body}</p>}
            {ad.cta_url && (
              <a
                href={ad.cta_url}
                target={isExternal ? "_blank" : "_self"}
                rel={isExternal ? "noopener noreferrer" : undefined}
                onClick={handleClick}
                className="block w-full text-center py-3 rounded-xl font-bold text-sm bg-brand text-white hover:opacity-90 transition-opacity"
              >
                {ad.cta_label || "Learn More"} {isExternal && <ExternalLink size={13} className="inline ml-1" />}
              </a>
            )}
          </div>
          {ads.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {ads.map((_, i) => (
                <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i === adIndex ? "bg-brand w-3" : "bg-faint"}`} />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Inline banner (default) ──────────────────────────────────────────────
  const innerContent = (
    <div className="flex items-center gap-3 flex-1 min-w-0">
      {media}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[9px] font-black uppercase tracking-widest text-faint bg-surface-2 border border-app px-1.5 py-0.5 rounded">
            Sponsored
          </span>
          <span className={`font-bold text-main truncate ${compact ? "text-xs" : "text-sm"}`}>
            {ad.title}
          </span>
        </div>
        {ad.body && !compact && (
          <p className="text-xs text-muted mt-0.5 line-clamp-1">{ad.body}</p>
        )}
      </div>
      {ad.cta_url && (
        <span className="shrink-0 flex items-center gap-1 text-xs font-semibold text-brand hover:underline whitespace-nowrap">
          {ad.cta_label || "Learn more"}
          {isExternal && <ExternalLink size={11} />}
        </span>
      )}
    </div>
  );

  return (
    <div className={`rounded-xl border border-app bg-surface overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300 ${compact ? "mb-3" : "mb-5"}`}>
      <div className={`flex items-center gap-3 ${compact ? "px-3 py-2" : "px-4 py-3"}`}>
        {ad.cta_url ? (
          <a
            href={ad.cta_url}
            target={isExternal ? "_blank" : "_self"}
            rel={isExternal ? "noopener noreferrer" : undefined}
            onClick={handleClick}
            className="flex-1 flex items-center gap-3 min-w-0 hover:opacity-80 transition-opacity"
          >
            {innerContent}
          </a>
        ) : (
          <div className="flex-1 flex items-center gap-3 min-w-0">{innerContent}</div>
        )}
        <CloseButton />
      </div>
      {/* Multi-ad dots */}
      {ads.length > 1 && (
        <div className="flex gap-1 justify-center pb-1.5">
          {ads.map((_, i) => (
            <div key={i} className={`h-1 rounded-full transition-all ${i === adIndex ? "w-4 bg-brand" : "w-1 bg-faint"}`} />
          ))}
        </div>
      )}
    </div>
  );
}
