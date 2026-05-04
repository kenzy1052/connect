import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { ExternalLink, X } from "lucide-react";

export default function AdBanner({ slot = "floating-overlay" }) {
  const [ad, setAd] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // For testing, I've disabled the sessionStorage check so you see it every refresh
    // const key = `ad_dismissed_${slot}`;
    // if (sessionStorage.getItem(key)) return;

    const fetchAd = async () => {
      try {
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

        if (!error && data) setAd(data);
      } catch (err) {
        console.error("Ad fetch failed", err);
      } finally {
        setLoaded(true);
      }
    };

    fetchAd();
  }, [slot]);

  const handleDismiss = (e) => {
    e.stopPropagation();
    setDismissed(true);
    sessionStorage.setItem(`ad_dismissed_${slot}`, "1");
    if (ad?.id) {
      supabase
        .from("ad_events")
        .insert({ ad_id: ad.id, slot_key: slot, kind: "dismiss" });
    }
  };

  const handleClick = () => {
    if (ad?.id) {
      supabase
        .from("ad_events")
        .insert({ ad_id: ad.id, slot_key: slot, kind: "click" });
    }
  };

  if (!loaded || dismissed || !ad) return null;

  const isExternal = ad.cta_url?.startsWith("http");

  return (
    <div className="fixed bottom-6 right-0 left-0 md:left-auto md:right-6 z-[9999] px-4 md:px-0 animate-in fade-in slide-in-from-bottom-10 duration-700">
      <div className="relative w-full md:w-[380px] group bg-surface/80 backdrop-blur-xl border border-app shadow-2xl rounded-2xl overflow-hidden hover:border-brand/50 transition-all duration-300">
        {/* Dismiss Button - Top Right */}
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 z-20 p-1.5 rounded-full bg-black/40 text-white/80 hover:bg-black/60 hover:text-white transition-all"
        >
          <X size={16} />
        </button>

        {/* Media Section - Full Width, 16:9 Aspect Ratio */}
        <div className="relative w-full aspect-video bg-black overflow-hidden">
          {ad.video_url ? (
            <video
              src={ad.video_url}
              autoPlay
              muted
              loop
              playsInline
              className="w-full h-full object-cover"
            />
          ) : ad.image_url ? (
            <img
              src={ad.image_url}
              alt=""
              className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand/20 to-surface">
              <span className="text-brand font-bold opacity-40 uppercase tracking-widest">
                Premium Ad
              </span>
            </div>
          )}

          {/* Badge */}
          <div className="absolute bottom-2 left-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-white bg-black/50 backdrop-blur-md px-2 py-1 rounded-md border border-white/10">
              Sponsored
            </span>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-4">
          <h3 className="text-base font-bold text-main line-clamp-1 group-hover:text-brand transition-colors">
            {ad.title}
          </h3>
          {ad.body && (
            <p className="text-sm text-muted mt-1 line-clamp-2 leading-relaxed">
              {ad.body}
            </p>
          )}

          {/* Action Button */}
          {ad.cta_url && (
            <a
              href={ad.cta_url}
              target={isExternal ? "_blank" : "_self"}
              rel={isExternal ? "noopener noreferrer" : undefined}
              onClick={handleClick}
              className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-brand text-white text-sm font-bold rounded-xl hover:brightness-110 active:scale-[0.98] transition-all"
            >
              Learn More
              {isExternal && <ExternalLink size={14} />}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
