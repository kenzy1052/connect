import { useEffect, useState } from "react";
import { useSearchParams, useOutletContext } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { FeedList } from "../components/Feed/FeedList";

// Same fuzzy variants as the feed hook
const KNOWN_MISSPELLINGS = {
  phan: "phone", fon: "phone", fone: "phone", phon: "phone",
  labtop: "laptop", laptp: "laptop", laptoop: "laptop",
  earfone: "earphone", headfone: "headphone",
  charjer: "charger", chager: "charger",
  caluclator: "calculator", calcuator: "calculator",
  textbok: "textbook", texbook: "textbook",
  airpod: "airpods", keybord: "keyboard",
  mous: "mouse", monitr: "monitor", moniter: "monitor",
  wireles: "wireless", blutooth: "bluetooth",
  camare: "camera", camra: "camera",
  sneker: "sneaker", bacpak: "backpack",
  speeker: "speaker", batary: "battery",
  televison: "television", jens: "jeans",
};

const PHONETIC_SUBS = [
  [/ph/g, "f"], [/f(?!f)/g, "ph"],
  [/ck/g, "k"], [/ght/g, "t"], [/ou/g, "u"], [/oo/g, "u"],
];

function generateSearchVariants(query) {
  const q = query.toLowerCase().trim();
  if (!q) return [q];
  const variants = new Set([q]);
  if (KNOWN_MISSPELLINGS[q]) variants.add(KNOWN_MISSPELLINGS[q]);
  for (const [from, to] of PHONETIC_SUBS) {
    const v = q.replace(from, to);
    if (v !== q && v.length >= 2) variants.add(v);
  }
  if (q.length >= 4) variants.add(q.substring(0, Math.ceil(q.length * 0.6)));
  return [...variants].slice(0, 5);
}

export default function SearchResults() {
  const [params] = useSearchParams();
  const q = params.get("q") || "";
  const { openDetailView } = useOutletContext();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const terms = generateSearchVariants(q.trim());
    const orParts = terms.flatMap((t) => [
      `title.ilike.%${t}%`,
      `description.ilike.%${t}%`,
    ]);

    supabase
      .from("discovery_feed")
      .select("*")
      .or(orParts.join(","))
      .eq("is_active", true)
      .eq("is_hidden", false)
      .eq("is_deleted", false)
      .order("visibility_score", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (!cancelled) {
          const items = data || [];
          setResults(items);
          setTotalCount(items.length);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [q]);

  const didYouMean = q && KNOWN_MISSPELLINGS[q.toLowerCase().trim()]
    ? KNOWN_MISSPELLINGS[q.toLowerCase().trim()]
    : null;

  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">
        Search results
      </p>
      <h1 className="text-2xl font-black text-white mb-1">
        {q ? <>Results for &ldquo;{q}&rdquo;</> : "Type something to search"}
      </h1>

      {!loading && q && totalCount > 0 && (
        <p className="text-sm text-slate-500 mb-5">
          {totalCount} listing{totalCount !== 1 ? "s" : ""} found
        </p>
      )}

      {!loading && didYouMean && results.length === 0 && (
        <p className="text-sm text-slate-400 mb-5">
          Did you mean{" "}
          <a href={`?q=${didYouMean}`} className="text-brand font-semibold hover:underline">
            {didYouMean}
          </a>
          ?
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      ) : (
        <FeedList listings={results} onListingClick={openDetailView} />
      )}
    </div>
  );
}
