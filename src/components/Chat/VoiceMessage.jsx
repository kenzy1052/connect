import { useEffect, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";

const CACHE = new Map(); // path -> signed url

async function getSignedUrl(path) {
  if (CACHE.has(path)) return CACHE.get(path);
  const { data } = await supabase.storage
    .from("voice-messages")
    .createSignedUrl(path, 60 * 60);
  if (data?.signedUrl) CACHE.set(path, data.signedUrl);
  return data?.signedUrl || null;
}

function fmt(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default function VoiceMessage({ path, durationMs, mine }) {
  const [url, setUrl] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef(null);

  useEffect(() => {
    let ok = true;
    getSignedUrl(path).then((u) => ok && setUrl(u));
    return () => {
      ok = false;
    };
  }, [path]);

  const toggle = async () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      try {
        await audioRef.current.play();
      } catch {}
    }
  };

  const bars = 24;
  const activeBars = Math.round((progress || 0) * bars);

  return (
    <div className="flex items-center gap-2.5 min-w-[180px]">
      <button
        type="button"
        onClick={toggle}
        disabled={!url}
        className={
          "w-8 h-8 rounded-full grid place-items-center shrink-0 " +
          (mine
            ? "bg-white/25 text-current hover:bg-white/35"
            : "bg-brand text-[hsl(var(--primary-fg))] hover:brightness-110") +
          " disabled:opacity-50 transition-all"
        }
      >
        {playing ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
      </button>
      <div className="flex-1 flex items-center gap-[2px] h-6">
        {Array.from({ length: bars }).map((_, i) => {
          const h = 30 + ((i * 37) % 70);
          const on = i < activeBars;
          return (
            <span
              key={i}
              className={
                "w-[3px] rounded-full transition-colors " +
                (mine
                  ? on
                    ? "bg-white"
                    : "bg-white/40"
                  : on
                  ? "bg-brand"
                  : "bg-main/25")
              }
              style={{ height: `${h}%` }}
            />
          );
        })}
      </div>
      <span className={"text-[10px] tabular-nums shrink-0 " + (mine ? "opacity-80" : "text-faint")}>
        {fmt(durationMs || 0)}
      </span>
      {url && (
        <audio
          ref={audioRef}
          src={url}
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => {
            setPlaying(false);
            setProgress(0);
          }}
          onTimeUpdate={(e) => {
            const el = e.currentTarget;
            if (el.duration) setProgress(el.currentTime / el.duration);
          }}
        />
      )}
    </div>
  );
}
