import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { Star, MessageSquare, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "../../context/ToastContext";

export default function Reviews({ sellerId, listingId, canReview }) {
  const toast = useToast();
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  useEffect(() => {
    fetchReviews();
  }, [sellerId]);

  async function fetchReviews() {
    setLoading(true);

    // Step 1: fetch reviews (no FK join since reviews.reviewer_id → auth.users, not profiles)
    const { data: reviewData, error } = await supabase
      .from("reviews")
      .select("id, listing_id, seller_id, reviewer_id, rating, body, created_at")
      .eq("seller_id", sellerId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching reviews:", error);
      setReviews([]);
      setLoading(false);
      return;
    }

    if (!reviewData || reviewData.length === 0) {
      setReviews([]);
      setLoading(false);
      return;
    }

    // Step 2: fetch reviewer profiles separately
    const reviewerIds = [...new Set(reviewData.map((r) => r.reviewer_id))];
    const { data: profileData } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", reviewerIds);

    const profileMap = {};
    (profileData || []).forEach((p) => { profileMap[p.id] = p; });

    // Step 3: merge
    const merged = reviewData.map((r) => ({
      ...r,
      reviewer: profileMap[r.reviewer_id] || null,
    }));

    setReviews(merged);
    setLoading(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canReview || !user) return;
    setSubmitting(true);

    const { error } = await supabase.from("reviews").insert({
      listing_id: listingId,
      seller_id: sellerId,
      reviewer_id: user.id,
      rating,
      body: comment.trim() || null,
    });

    if (error) {
      if (error.code === "23505") {
        toast.error("You have already reviewed this seller.");
      } else if (error.code === "42P01") {
        toast.error("Reviews feature is not yet set up. Please contact admin.");
      } else {
        toast.error(error.message || "Failed to submit review.");
      }
    } else {
      toast.success("Review submitted!");
      setComment("");
      setRating(5);
      fetchReviews();
    }
    setSubmitting(false);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 text-[hsl(var(--primary))] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-[hsl(var(--primary))]" />
          Seller Reviews ({reviews.length})
        </h2>
      </div>

      {canReview && (
        <form
          onSubmit={handleSubmit}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4"
        >
          <p className="text-sm font-bold text-white">Rate your experience</p>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setRating(num)}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                  rating >= num
                    ? "bg-yellow-500/20 text-yellow-400"
                    : "bg-slate-800 text-slate-500"
                }`}
              >
                <Star className="w-5 h-5" fill={rating >= num ? "currentColor" : "none"} />
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="How was the transaction? (Optional)"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-white placeholder:text-slate-600 focus:border-[hsl(var(--primary))] outline-none min-h-[100px]"
          />
          <button
            type="submit"
            disabled={submitting}
            className="bg-[hsl(var(--primary))] hover:brightness-110 disabled:opacity-50 text-[hsl(var(--primary-fg))] px-6 py-2.5 rounded-xl font-bold text-sm transition-all"
          >
            {submitting ? "Submitting..." : "Post Review"}
          </button>
        </form>
      )}

      <div className="space-y-4">
        {reviews.length === 0 ? (
          <div className="text-center py-12 bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl">
            <p className="text-slate-500 text-sm">No reviews yet for this seller.</p>
          </div>
        ) : (
          reviews.map((review) => (
            <div key={review.id} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[hsl(var(--primary))] flex items-center justify-center text-[hsl(var(--primary-fg))] text-xs font-bold overflow-hidden">
                    {review.reviewer?.avatar_url ? (
                      <img src={review.reviewer.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
                    ) : (
                      <span>{(review.reviewer?.full_name || "?")[0]?.toUpperCase()}</span>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">
                      {review.reviewer?.full_name || "Student"}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3 h-3 ${i < review.rating ? "text-yellow-400 fill-yellow-400" : "text-slate-700"}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] text-slate-600">
                  {new Date(review.created_at).toLocaleDateString()}
                </span>
              </div>
              {review.body && (
                <p className="mt-3 text-sm text-slate-400 leading-relaxed">{review.body}</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
