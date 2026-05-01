import { useEffect, useState } from "react";
import { useSearchParams, useOutletContext } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { FeedList } from "../components/Feed/FeedList";

export default function SearchResults() {
  const [params] = useSearchParams();
  const q = params.get("q") || "";
  const { openDetailView } = useOutletContext();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    supabase
      .from("discovery_feed")
      .select("*")
      .ilike("title", `%${q}%`)
      .limit(50)
      .then(({ data }) => {
        if (!cancelled) {
          setResults(data || []);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [q]);

  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">
        Search results
      </p>
      <h1 className="text-2xl font-black text-white mb-6">
        {q ? <>Results for &ldquo;{q}&rdquo;</> : "Type something to search"}
      </h1>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      ) : results.length === 0 ? (
        <p className="text-slate-500 text-sm">
          No listings matched your search.
        </p>
      ) : (
        <FeedList listings={results} onListingClick={openDetailView} />
      )}
    </div>
  );
}
