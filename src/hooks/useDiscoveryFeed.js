import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "../lib/supabaseClient";

const ITEMS_PER_PAGE = 10;

// ── Fuzzy / typo-tolerant search term expander ──────────────────────────────
const KNOWN_MISSPELLINGS = {
  phan: "phone", fon: "phone", fone: "phone", phon: "phone",
  labtop: "laptop", laptp: "laptop", laptoop: "laptop",
  earfone: "earphone", headfone: "headphone",
  charjer: "charger", chager: "charger", chargr: "charger",
  caluclator: "calculator", calcuator: "calculator",
  textbok: "textbook", texbook: "textbook",
  airpod: "airpods", airpord: "airpods",
  keybord: "keyboard", keyborad: "keyboard",
  mous: "mouse", moues: "mouse",
  monitr: "monitor", moniter: "monitor",
  headfones: "headphones",
  wireles: "wireless", wirless: "wireless",
  blutooth: "bluetooth", bluethoth: "bluetooth",
  camare: "camera", camra: "camera",
  sneker: "sneaker", sneeker: "sneakers",
  bacpak: "backpack", bagpak: "backpack",
  speeker: "speaker", speker: "speaker",
  batary: "battery", batery: "battery",
  televison: "television", televisoin: "television",
  scaner: "scanner", priner: "printer",
  microwav: "microwave", refridgerator: "refrigerator",
  jens: "jeans", tshirt: "t-shirt",
};

const PHONETIC_SUBS = [
  [/ph/g, "f"],
  [/f(?!f)/g, "ph"],
  [/ck/g, "k"],
  [/ght/g, "t"],
  [/qu/g, "kw"],
  [/wh/g, "w"],
  [/ou/g, "u"],
  [/oo/g, "u"],
  [/ae/g, "e"],
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

  if (q.length >= 4) {
    variants.add(q.substring(0, Math.ceil(q.length * 0.6)));
  }

  return [...variants].slice(0, 5);
}

export function useDiscoveryFeed() {
  const [filter, setFilter]           = useState("all");
  const [categoryId, setCategoryId]   = useState("");
  const [searchTerm, setSearchTerm]   = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categories, setCategories]   = useState([]);
  const [listings, setListings]       = useState([]);
  const [loading, setLoading]         = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [error, setError]             = useState(null);
  const [hasMore, setHasMore]         = useState(true);
  const [cursor, setCursor]           = useState(null);
  const [resetKey, setResetKey]       = useState(0);

  const [minPrice, setMinPrice] = useState(null);
  const [maxPrice, setMaxPrice] = useState(null);
  const [sortBy, setSortBy]     = useState("best");

  const requestIdRef      = useRef(0);
  const listingsCountRef  = useRef(0);

  // ── Categories ─────────────────────────────────────────────────────────
  // NOTE: as of the category-hierarchy migration, `categories` can contain
  // subcategories (parent_id NOT NULL). Filters/hero/nav were built for a
  // flat top-level list, so we deliberately fetch only parent_id IS NULL
  // here. The posting form (CreateListing.jsx) fetches the full hierarchy
  // separately under its own cache key.
  useEffect(() => {
    const cached = localStorage.getItem("cc.categories.top.v1");
    if (cached) {
      try {
        const { ts, data } = JSON.parse(cached);
        if (Date.now() - ts < 60 * 60 * 1000) { setCategories(data); return; }
      } catch {}
    }
    supabase.from("categories").select("*").is("parent_id", null).then(({ data }) => {
      if (data) {
        setCategories(data);
        localStorage.setItem("cc.categories.top.v1", JSON.stringify({ ts: Date.now(), data }));
      }
    });
  }, []);

  // ── Debounce search ────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // ── Core fetch ─────────────────────────────────────────────────────────
  const fetchListings = useCallback(
    async (reset = false, cursorOverride = cursor) => {
      const requestId = ++requestIdRef.current;
      setLoading(true);
      setError(null);

      try {
        const cleanQ = debouncedSearch?.trim().replace(/[%,()]/g, "") || "";
        const isSearching = cleanQ.length > 0;
        let data, error;

        if (isSearching) {
          // ── FUZZY SEARCH PATH ──────────────────────────────────────────
          const offset = reset ? 0 : listingsCountRef.current;
          const terms = generateSearchVariants(cleanQ);

          const orParts = terms.flatMap((t) => [
            `title.ilike.%${t}%`,
            `description.ilike.%${t}%`,
          ]);

          let q = supabase
            .from("discovery_feed")
            .select("*")
            .eq("is_active", true)
            .eq("is_hidden", false)
            .eq("is_deleted", false)
            .or(orParts.join(","));

          if (filter !== "all") q = q.eq("listing_type", filter);
          if (categoryId)       q = q.eq("category_id", categoryId);
          if (minPrice != null) q = q.gte("price", minPrice);
          if (maxPrice != null) q = q.lte("price", maxPrice);

          q = q
            .order("visibility_score", { ascending: false })
            .order("created_at", { ascending: false })
            .range(offset, offset + ITEMS_PER_PAGE - 1);

          const res = await q;
          data  = res.data;
          error = res.error;
        } else {
          // ── BROWSE PATH ────────────────────────────────────────────────
          let query = supabase
            .from("discovery_feed")
            .select("*")
            .eq("is_active", true)
            .eq("is_hidden", false)
            .eq("is_deleted", false);

          if (minPrice != null) query = query.or(`price.gte.${minPrice},price_min.gte.${minPrice}`);
          if (maxPrice != null) query = query.or(`price.lte.${maxPrice},price_max.lte.${maxPrice}`);

          if (sortBy === "newest") {
            query = query.order("created_at", { ascending: false }).order("id", { ascending: false });
          } else if (sortBy === "oldest") {
            query = query.order("created_at", { ascending: true }).order("id", { ascending: true });
          } else if (sortBy === "price_asc") {
            query = query.order("price", { ascending: true, nullsFirst: false }).order("id", { ascending: false });
          } else if (sortBy === "price_desc") {
            query = query.order("price", { ascending: false, nullsFirst: false }).order("id", { ascending: false });
          } else {
            query = query
              .order("visibility_score", { ascending: false })
              .order("created_at", { ascending: false })
              .order("id", { ascending: false });
          }

          if (filter !== "all") query = query.eq("listing_type", filter);
          if (categoryId)       query = query.eq("category_id", categoryId);

          query = query.limit(ITEMS_PER_PAGE);

          if (sortBy === "best" && !reset && cursorOverride) {
            query = query.or(
              `visibility_score.lt.${cursorOverride.score},and(visibility_score.eq.${cursorOverride.score},created_at.lt.${cursorOverride.created_at}),and(visibility_score.eq.${cursorOverride.score},created_at.eq.${cursorOverride.created_at},id.lt.${cursorOverride.id})`
            );
          } else if (sortBy !== "best" && !reset) {
            query = query.range(listingsCountRef.current, listingsCountRef.current + ITEMS_PER_PAGE - 1);
          }

          const res = await query;
          data  = res.data;
          error = res.error;
        }

        if (error) throw error;
        if (requestId !== requestIdRef.current) return;

        if (!data || data.length === 0) {
          setHasMore(false);
          if (reset) setListings([]);
          return;
        }

        setListings((prev) => {
          const ids  = new Set(prev.map((i) => i.id));
          const next = reset ? data : [...prev, ...data.filter((d) => !ids.has(d.id))];
          listingsCountRef.current = next.length;
          return next;
        });

        if (!isSearching && sortBy === "best" && data.length > 0) {
          const last = data[data.length - 1];
          setCursor({ score: last.visibility_score, created_at: last.created_at, id: last.id });
        } else {
          setCursor(null);
        }

        if (data.length < ITEMS_PER_PAGE) setHasMore(false);
      } catch (err) {
        console.error("Feed Error:", err.message);
        setError(err.message);
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
          setIsInitialLoading(false);
        }
      }
    },
    [filter, categoryId, debouncedSearch, minPrice, maxPrice, sortBy, cursor]
  );

  // ── Reset on filter / search / sort / price / resetKey change ──────────
  useEffect(() => {
    requestIdRef.current++;
    setCursor(null);
    setHasMore(true);
    setIsInitialLoading(true);
    fetchListings(true, null);
  }, [filter, categoryId, debouncedSearch, minPrice, maxPrice, sortBy, resetKey]);

  const loadMore = () => { if (!loading && hasMore) fetchListings(false, cursor); };
  const refetch  = useCallback(() => setResetKey((k) => k + 1), []);

  // ── Realtime: prepend new listings as they're posted ───────────────────
  // Subscribes to INSERT events on the `listings` table. When a new listing
  // is published, we fetch its full `discovery_feed` row (which has all
  // computed columns like visibility_score) and prepend it to the list so
  // buyers see it instantly without refreshing the page.
  //
  // IMPORTANT: We remove any stale channel with the same name before
  // subscribing. React StrictMode mounts effects twice in development;
  // Supabase reuses channels by name, so without this cleanup the second
  // mount tries to call .on() on an already-subscribed channel and throws.
  useEffect(() => {
    const CHANNEL_NAME = "feed-new-listings";
    const stale = supabase
      .getChannels()
      .find((ch) => ch.topic === `realtime:${CHANNEL_NAME}`);
    if (stale) supabase.removeChannel(stale);

    const channel = supabase
      .channel(CHANNEL_NAME)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "listings" },
        async (payload) => {
          // Short delay so DB triggers (is_active, visibility_score) finish
          await new Promise((r) => setTimeout(r, 1500));

          const { data } = await supabase
            .from("discovery_feed")
            .select("*")
            .eq("id", payload.new.id)
            .eq("is_active", true)
            .eq("is_hidden", false)
            .eq("is_deleted", false)
            .maybeSingle();

          if (data) {
            setListings((prev) => {
              if (prev.some((l) => l.id === data.id)) return prev;
              listingsCountRef.current = prev.length + 1;
              return [data, ...prev];
            });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []); // runs once — stable channel, uses functional state updates

  return {
    listings, categories, loading, isInitialLoading, error, hasMore, loadMore, refetch,
    filter, setFilter, categoryId, setCategoryId,
    searchTerm, setSearchTerm, minPrice, setMinPrice, maxPrice, setMaxPrice, sortBy, setSortBy,
  };
}
