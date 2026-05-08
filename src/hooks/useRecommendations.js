// src/hooks/useRecommendations.js
// Personalized recommendations based on what the user browses
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

const VIEW_STORAGE_KEY = "cc.viewed_listings.v1";
const CAT_STORAGE_KEY = "cc.viewed_categories.v1";
const MAX_HISTORY = 20;

// ── Helpers ─────────────────────────────────────────────────────────────────
function getViewHistory() {
  try { return JSON.parse(localStorage.getItem(VIEW_STORAGE_KEY) || "[]"); }
  catch { return []; }
}

function getCategoryHistory() {
  try { return JSON.parse(localStorage.getItem(CAT_STORAGE_KEY) || "[]"); }
  catch { return []; }
}

/**
 * Call this whenever a user opens a listing so we can learn their preferences.
 * Safe to call from any component — no hook context needed.
 */
export function trackListingView(listing) {
  if (!listing?.id) return;

  // Track the listing id
  const views = getViewHistory();
  const updated = [listing.id, ...views.filter((id) => id !== listing.id)].slice(0, MAX_HISTORY);
  localStorage.setItem(VIEW_STORAGE_KEY, JSON.stringify(updated));

  // Track the category
  if (listing.category_id) {
    const cats = getCategoryHistory();
    const catEntry = { id: listing.category_id, name: listing.category_name };
    const updatedCats = [catEntry, ...cats.filter((c) => c.id !== listing.category_id)].slice(0, 10);
    localStorage.setItem(CAT_STORAGE_KEY, JSON.stringify(updatedCats));
  }
}

/**
 * Returns personalized recommendations for the current user.
 *
 * Strategy:
 *   1. Read their recently-viewed category ids from localStorage.
 *   2. Fetch active listings from those categories.
 *   3. Exclude listings they've already viewed.
 *   4. Sort by visibility_score.
 */
export function useRecommendations(userId) {
  const [recommended, setRecommended] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState(""); // human-readable "because you viewed X"

  useEffect(() => {
    const cats = getCategoryHistory();
    const viewedIds = getViewHistory();

    if (cats.length === 0) {
      setRecommended([]);
      return;
    }

    const topCategoryIds = cats.slice(0, 3).map((c) => c.id).filter(Boolean);
    const topCategoryName = cats[0]?.name;

    setLoading(true);

    supabase
      .from("discovery_feed")
      .select("*")
      .in("category_id", topCategoryIds)
      .eq("is_active", true)
      .eq("is_hidden", false)
      .eq("is_deleted", false)
      .order("visibility_score", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (!data) { setLoading(false); return; }
        // Remove listings already viewed + deduplicate
        const filtered = data.filter((l) => !viewedIds.includes(l.id));
        setRecommended(filtered.slice(0, 10));
        if (topCategoryName) setReason(topCategoryName);
        setLoading(false);
      });
  }, [userId]);

  /** Called from a listing detail view — records the view and refreshes recs */
  const trackView = useCallback((listing) => {
    trackListingView(listing);
  }, []);

  return { recommended, loading, reason, trackView };
}
