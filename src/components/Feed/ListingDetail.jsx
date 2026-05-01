import { Helmet } from "react-helmet-async";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Share2,
  MoreHorizontal,
  Eye,
  Calendar,
  Tag,
  Phone,
  Flag,
  ChevronRight,
  ShieldCheck,
  ZoomIn,
  ChevronLeft,
  Star,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { useRequireAuth } from "../../hooks/useRequireAuth";
import ReportModal from "./ReportModal";
import SaveButton from "./SaveButton";
import Reviews from "./Reviews";
import SuggestedItems from "./SuggestedItems";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Fullscreen from "yet-another-react-lightbox/plugins/fullscreen";
import "yet-another-react-lightbox/styles.css";

/* Brand icon not in lucide-react — inline SVG */
function WhatsAppIcon({ size = 18, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

function DetailSkeleton() {
  return (
    <div className="max-w-5xl mx-auto pb-24 animate-pulse">
      <div className="h-4 w-64 bg-slate-800 rounded mb-6" />
      <div className="grid md:grid-cols-[1fr_380px] gap-8">
        <div className="space-y-4">
          <div className="aspect-[4/3] bg-slate-900 rounded-2xl" />
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-20 h-20 bg-slate-900 rounded-xl" />
            ))}
          </div>
          <div className="bg-slate-900 rounded-2xl p-6 space-y-2">
            <div className="h-3 w-24 bg-slate-800 rounded" />
            <div className="h-3 w-full bg-slate-800 rounded" />
            <div className="h-3 w-3/4 bg-slate-800 rounded" />
          </div>
        </div>
        <div className="space-y-4">
          <div className="bg-slate-900 rounded-2xl p-6 space-y-3">
            <div className="h-3 w-24 bg-slate-800 rounded" />
            <div className="h-6 w-3/4 bg-slate-800 rounded" />
            <div className="h-8 w-1/2 bg-slate-800 rounded" />
          </div>
          <div className="bg-slate-900 rounded-2xl p-5 h-28" />
          <div className="bg-slate-900 rounded-2xl p-5 h-32" />
        </div>
      </div>
    </div>
  );
}

export default function ListingDetail({ listing, listingId, onBack, onOpen }) {
  const { user } = useAuth();
  const requireAuth = useRequireAuth();
  const [listingData, setListingData] = useState(listing);
  const [images, setImages] = useState([]);
  const [current, setCurrent] = useState(0);
  const [showContact, setShowContact] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [phones, setPhones] = useState([]);
  const [whatsapp, setWhatsapp] = useState(null);
  const [reportStatus, setReportStatus] = useState(null);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("description");

  const slides = useMemo(
    () => images.map((img) => ({ src: img.image_url })),
    [images],
  );

  const isOwnListing = listingData ? user?.id === listingData.seller_id : false;

  const fetchListing = useCallback(async () => {
    const id = listing?.id || listingId;
    if (!id) return null;
    const { data } = await supabase
      .from("discovery_feed")
      .select("*")
      .eq("id", id)
      .single();
    if (!data) return null;
    // Also fetch condition from listings table (not always in discovery_feed view)
    const { data: extra } = await supabase
      .from("listings")
      .select("condition, listing_type, negotiable, location")
      .eq("id", id)
      .single();
    return extra ? { ...data, condition: extra.condition ?? data.condition, listing_type: extra.listing_type ?? data.listing_type, negotiable: extra.negotiable ?? data.negotiable } : data;
  }, [listing?.id, listingId]);

  const recordEngagement = useCallback(
    async (type) => {
      const lid = listing?.id || listingId;
      if (!user || !lid) return;
      try {
        await supabase.from("listing_engagements").upsert(
          { listing_id: lid, user_id: user.id, type },
          { onConflict: "listing_id,user_id,type", ignoreDuplicates: true }
        );
      } catch (err) {
        // non-critical, ignore silently
      }
    },
    [listing?.id, listingId, user],
  );

  const recordView = useCallback(
    () => recordEngagement("view"),
    [recordEngagement],
  );

  const recordContact = (e) => {
    if (!requireAuth()) {
      e?.preventDefault();
      return;
    }
    recordEngagement("contact");
  };

  const handleRevealContact = () => {
    if (!requireAuth()) return;
    setShowContact(true);
    recordEngagement("contact");
  };

  const fetchImages = useCallback(async () => {
    const id = listing?.id || listingId;
    if (!id) return [];
    const { data } = await supabase
      .from("listing_images")
      .select("*")
      .eq("listing_id", id)
      .order("position");
    return data || [];
  }, [listing?.id, listingId]);

  const fetchContacts = useCallback(async () => {
    const sellerId = listing?.seller_id || null;
    if (!sellerId) return { whatsapp: null, phones: [] };
    const { data, error } = await supabase.rpc("get_seller_contacts", {
      p_seller_id: sellerId,
    });
    if (error || !data) {
      return { whatsapp: null, phones: [] };
    }
    return {
      whatsapp: data.find((c) => c.type === "whatsapp")?.phone_number || null,
      phones: data.filter((c) => c.type === "phone").map((c) => c.phone_number),
    };
  }, [listing?.seller_id]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const loadListingData = async () => {
      const [nextListing, nextImages, nextContacts] = await Promise.all([
        fetchListing(),
        fetchImages(),
        fetchContacts(),
      ]);
      if (cancelled) return;
      if (nextListing) setListingData(nextListing);
      setImages(nextImages);
      setWhatsapp(nextContacts.whatsapp);
      setPhones(nextContacts.phones);
      setLoading(false);
    };

    loadListingData();
    recordView();
    return () => {
      cancelled = true;
    };
  }, [fetchContacts, fetchImages, fetchListing, recordView]);

  useEffect(() => {
    const checkReportStatus = async () => {
      if (!user?.id || !(listing?.id || listingId)) return;
      const { data } = await supabase
        .from("reports")
        .select("id, is_resolved")
        .eq("listing_id", listing?.id || listingId)
        .eq("reporter_id", user.id)
        .maybeSingle();
      if (data) setReportStatus(data.is_resolved ? "resolved" : "submitted");
    };
    if (user) checkReportStatus();
  }, [listing?.id, listingId, user]);

  const getPriceDisplay = () => {
    if (listingData.price !== null) return "GH₵ " + listingData.price;
    if (listingData.price_min && listingData.price_max)
      return "GH₵ " + listingData.price_min + " – " + listingData.price_max;
    if (listingData.price_min) return "From GH₵ " + listingData.price_min;
    if (listingData.price_max) return "Up to GH₵ " + listingData.price_max;
    return "Ask for price";
  };

  const handleShare = async () => {
    const url = window.location.href;
    const text = `${listingData.title} — ${getPriceDisplay()} on CampusConnect`;
    if (navigator.share) {
      try {
        await navigator.share({ title: listingData.title, text, url });
        return;
      } catch {
        /* user cancelled */
      }
    }
    window.open(
      `https://wa.me/?text=${encodeURIComponent(text + " " + url)}`,
      "_blank",
    );
  };

  const initials = (listingData?.seller_name || "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const createdDate = listingData?.created_at
    ? new Date(listingData.created_at).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  const whatsappMessage = encodeURIComponent(
    `Hi, I am interested in "${listingData?.title || ""}" on CampusConnect. Is it still available?`,
  );
  const whatsappLink = whatsapp
    ? `https://wa.me/233${whatsapp}?text=${whatsappMessage}`
    : null;

  const isService = listingData?.listing_type === "service";
  const prev = () => setCurrent((c) => (c - 1 + images.length) % images.length);
  const next = () => setCurrent((c) => (c + 1) % images.length);

  // Guard against null listingData before any constant/JSX access
  if (!listingData && loading) return <DetailSkeleton />;
  if (!listingData && !loading) return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <p className="text-slate-400 font-bold">Listing not found.</p>
      <button onClick={onBack} className="mt-4 text-sm text-indigo-400 hover:underline">← Back to Marketplace</button>
    </div>
  );
  // Full loading skeleton when we have a stale listing but are refreshing
  if (loading) return <DetailSkeleton />;

  return (
    <>
      <Helmet>
        <title>
          {listingData.title} — {getPriceDisplay()} | CampusConnect
        </title>
        <meta
          name="description"
          content={(listingData.description || "Listed on CampusConnect").slice(
            0,
            160,
          )}
        />
        <meta
          property="og:title"
          content={`${listingData.title} — ${getPriceDisplay()}`}
        />
        <meta
          property="og:description"
          content={(listingData.description || "Listed on CampusConnect").slice(
            0,
            160,
          )}
        />
        <meta
          property="og:image"
          content={images[0]?.image_url || "/og-image.png"}
        />
        <meta property="og:type" content="product" />
        <meta property="og:site_name" content="CampusConnect" />
      </Helmet>

      <Lightbox
        open={lightboxIndex !== null}
        close={() => setLightboxIndex(null)}
        index={lightboxIndex ?? 0}
        slides={slides}
        plugins={[Zoom, Fullscreen]}
        on={{
          view: ({ index }) => setLightboxIndex(index),
        }}
        zoom={{
          maxZoomPixelRatio: 5,
          zoomInMultiplier: 2,
          doubleTapDelay: 300,
        }}
        animation={{
          fade: 0,
          swipe: 300,
          navigation: 300,
          easing: {
            fade: "linear",
            swipe: "ease-out",
            navigation: "ease-out",
          },
        }}
        carousel={{
          finite: false,
          preload: 1,
          padding: 0,
          spacing: 0,
        }}
        styles={{
          root: { backgroundColor: "#000" },
          container: { backgroundColor: "#000" },
          slide: { backgroundColor: "#000" },
        }}
      />

      <div className="max-w-5xl mx-auto pb-24 animate-in fade-in duration-300">
        {/* ── BREADCRUMB ROW ── */}
        <div className="flex items-center justify-between mb-6">
          <nav className="flex items-center gap-1.5 text-sm text-slate-500 min-w-0">
            <button
              onClick={onBack}
              className="flex items-center gap-1 hover:text-white transition-colors shrink-0 group"
            >
              <ChevronLeft
                size={14}
                className="group-hover:-translate-x-0.5 transition-transform"
              />
              Back to Marketplace
            </button>
            {listingData.category_name && (
              <>
                <span className="text-slate-700 shrink-0">/</span>
                <Link
                  to={`/browse?category=${listingData.category_id}`}
                  className="hover:text-white transition-colors shrink-0"
                >
                  {listingData.category_name}
                </Link>
              </>
            )}
            <span className="text-slate-700 shrink-0">/</span>
            <span className="text-slate-300 font-medium truncate">
              {listingData.title}
            </span>
          </nav>

          {/* Desktop share / save */}
          <div className="hidden md:flex items-center gap-4 shrink-0 ml-4">
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm font-medium transition-colors"
            >
              <Share2 size={14} />
              Share
            </button>
            <SaveButton listingId={listingData.id} variant="text" />
          </div>
        </div>

        <div className="grid md:grid-cols-[1fr_380px] gap-8 items-start">
          {/* ══════════ LEFT — GALLERY + CONTENT ══════════ */}
          <div className="space-y-4">
            {/* Main image */}
            <div className="relative w-full aspect-[4/3] bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 group">
              {images.length > 0 ? (
                <>
                  <img
                    src={images[current].image_url}
                    className="w-full h-full object-cover transition-all duration-300"
                    alt={listingData.title}
                  />

                  {/* Type badge */}
                  <span
                    className={
                      "absolute top-3 left-3 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest backdrop-blur-md " +
                      (isService
                        ? "bg-indigo-600/70 text-white border border-indigo-400/40"
                        : "bg-emerald-600/70 text-white border border-emerald-400/40")
                    }
                  >
                    {isService ? "Service" : "Product"}
                  </span>

                  {/* Prev / Next arrows */}
                  {images.length > 1 && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          prev();
                        }}
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/55 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/80 active:scale-95 transition-all z-10 border border-white/10"
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          next();
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/55 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/80 active:scale-95 transition-all z-10 border border-white/10"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </>
                  )}

                  {/* Image counter — bottom left */}
                  {images.length > 1 && (
                    <span className="absolute bottom-3 left-3 bg-black/55 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1 rounded-full border border-white/10">
                      {current + 1} / {images.length}
                    </span>
                  )}

                  {/* Zoom — bottom right */}
                  <button
                    onClick={() => setLightboxIndex(current)}
                    className="absolute bottom-3 right-3 w-9 h-9 rounded-full bg-black/55 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/80 active:scale-95 transition-all border border-white/10"
                    title="Zoom"
                  >
                    <ZoomIn size={15} />
                  </button>
                </>
              ) : (
                <div className="flex items-center justify-center h-full flex-col gap-2">
                  <div className="text-5xl opacity-20">📷</div>
                  <p className="text-slate-600 text-sm">No images uploaded</p>
                </div>
              )}
            </div>

            {/* Thumbnail strip */}
            {images.length > 1 && (
              <div className="flex gap-2 flex-wrap">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrent(i)}
                    className={
                      "w-20 h-20 rounded-xl overflow-hidden border-2 transition-all relative group/thumb active:scale-95 " +
                      (i === current
                        ? "border-indigo-500"
                        : "border-slate-800 opacity-50 hover:opacity-100")
                    }
                  >
                    <img
                      src={img.image_url}
                      className="w-full h-full object-cover"
                      alt=""
                    />
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setLightboxIndex(i);
                      }}
                      className="absolute inset-0 bg-black/50 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-all"
                    >
                      <ZoomIn size={13} className="text-white" />
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Description / Reviews tabs */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="flex border-b border-slate-800">
                {[
                  { key: "description", label: "Description" },
                  {
                    key: "reviews",
                    label: listingData.review_count
                      ? `Reviews (${listingData.review_count})`
                      : "Reviews",
                  },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={
                      "px-6 py-3.5 text-sm font-bold transition-colors relative " +
                      (activeTab === key
                        ? "text-indigo-400"
                        : "text-slate-500 hover:text-slate-300")
                    }
                  >
                    {label}
                    {activeTab === key && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />
                    )}
                  </button>
                ))}
              </div>
              <div className="p-6">
                {activeTab === "description" ? (
                  <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                    {listingData.description || "No description provided."}
                  </p>
                ) : (
                  <Reviews
                    sellerId={listingData.seller_id}
                    listingId={listingData.id}
                    canReview={!!user && !isOwnListing}
                  />
                )}
              </div>
            </div>

            {/* More from / Browse category */}
            <section className="grid sm:grid-cols-2 gap-3">
              <Link
                to={`/seller/${listingData.seller_id}`}
                className="group flex items-center justify-between gap-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/40 rounded-2xl p-5 transition-all"
              >
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    More from
                  </p>
                  <p className="text-white font-bold truncate group-hover:text-indigo-400 transition-colors">
                    {listingData.seller_name}
                  </p>
                </div>
                <ChevronRight size={18} className="text-indigo-400 shrink-0" />
              </Link>

              <Link
                to={`/browse?category=${listingData.category_id}`}
                className="group flex items-center justify-between gap-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/40 rounded-2xl p-5 transition-all"
              >
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Explore
                  </p>
                  <p className="text-white font-bold truncate group-hover:text-indigo-400 transition-colors">
                    {listingData.category_name}
                  </p>
                </div>
                <ChevronRight size={18} className="text-indigo-400 shrink-0" />
              </Link>
            </section>
          </div>

          {/* ══════════ RIGHT — INFO PANEL ══════════ */}
          <div className="space-y-4 md:sticky md:top-6">
            {/* Title / price / stats card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              {/* Category chip + icon buttons */}
              <div className="flex items-center justify-between mb-4">
                <span className="inline-flex items-center gap-1.5 bg-indigo-600/15 border border-indigo-500/25 text-indigo-300 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full">
                  <ShieldCheck size={11} />
                  {listingData.category_name}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleShare}
                    className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors"
                    title="Share"
                  >
                    <Share2 size={14} className="text-slate-300" />
                  </button>
                  <SaveButton listingId={listingData.id} variant="icon" />
                  <button className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors">
                    <MoreHorizontal size={14} className="text-slate-300" />
                  </button>
                </div>
              </div>

              {/* Title */}
              <h1 className="text-[1.65rem] font-black text-white leading-tight tracking-tight mb-2">
                {listingData.title}
              </h1>

              {/* Price uses the active primary color across every theme. */}
              <div className="mb-4 pb-4 border-b border-slate-800/70">
                <span className="text-2xl font-black text-price">
                  {getPriceDisplay()}
                </span>
                {listingData.negotiable && (
                  <span className="ml-3 inline-flex align-middle text-[9px] font-black uppercase tracking-widest text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-full">
                    Negotiable
                  </span>
                )}
              </div>

              {/* Verified badge (services) */}
              {isService && (
                <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium mb-4">
                  <CheckCircle2 size={13} className="text-indigo-400" />
                  Verified Tech Service
                </div>
              )}

              {/* Stats grid */}
              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col items-center gap-1.5 py-3.5 bg-slate-800/40 rounded-xl border border-slate-800/80">
                  <Eye size={15} className="text-slate-500" />
                  <span className="text-white text-sm font-black">
                    {listingData.view_count || 0}
                  </span>
                  <span className="text-slate-500 text-[10px] font-semibold">
                    Views
                  </span>
                </div>
                <div className="flex flex-col items-center gap-1.5 py-3.5 bg-slate-800/40 rounded-xl border border-slate-800/80">
                  <Calendar size={15} className="text-slate-500" />
                  <span className="text-white text-[11px] font-black text-center leading-tight">
                    {createdDate || "—"}
                  </span>
                  <span className="text-slate-500 text-[10px] font-semibold">
                    Posted
                  </span>
                </div>
                <div className="flex flex-col items-center gap-1.5 py-3.5 bg-slate-800/40 rounded-xl border border-slate-800/80 overflow-hidden">
                  <Tag size={15} className="text-slate-500" />
                  <span className="text-white text-[10px] font-black text-center leading-tight px-1 truncate w-full">
                    {listingData.category_name}
                  </span>
                  <span className="text-slate-500 text-[10px] font-semibold">
                    Category
                  </span>
                </div>
              </div>

              {/* Condition (products only) */}
              {!isService && (
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-800/70 text-xs">
                  <span className="text-slate-500">Condition</span>
                  <span
                    className={
                      "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide " +
                      (listingData.condition === "new"
                        ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/25"
                        : listingData.condition === "used"
                          ? "bg-amber-500/15 text-amber-300 border border-amber-500/25"
                          : listingData.condition === "like_new" || listingData.condition === "like new"
                            ? "bg-sky-500/15 text-sky-300 border border-sky-500/25"
                            : "bg-slate-700/40 text-slate-400 border border-slate-700")
                    }
                  >
                    {listingData.condition
                      ? listingData.condition.replace(/_/g, " ")
                      : "Not specified"}
                  </span>
                </div>
              )}
            </div>

            {/* Seller card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">
                Seller
              </p>
              <Link
                to={`/seller/${listingData.seller_id}`}
                className="flex items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-indigo-600 flex items-center justify-center text-white font-black text-sm shrink-0 border-2 border-slate-700/80">
                    {listingData?.seller_avatar_url ? (
                      <img
                        src={listingData.seller_avatar_url}
                        alt={listingData.seller_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      initials
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white group-hover:text-indigo-400 transition-colors truncate">
                        {listingData.seller_name}
                      </span>
                      {(listingData.seller_trust ?? 50) >= 80 && (
                        <span className="inline-flex items-center gap-0.5 bg-amber-500/15 border border-amber-500/25 text-amber-300 text-[9px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full shrink-0">
                          Top Seller
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <ShieldCheck
                        size={11}
                        className="text-indigo-400"
                      />
                      <span className="text-sm font-bold text-white">
                        {listingData.seller_trust ?? listingData.trust_score ?? 50}
                      </span>
                      <span className="text-xs text-slate-500">Trust Score</span>
                      {listingData.response_rate && (
                        <>
                          <span className="text-slate-700">·</span>
                          <span className="text-xs text-slate-500">
                            {listingData.response_rate}% Response rate
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <ChevronRight
                  size={17}
                  className="text-slate-600 group-hover:text-indigo-400 transition-colors shrink-0"
                />
              </Link>
            </div>

            {/* Contact card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2.5">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">
                Contact Seller
              </p>

              {/* WhatsApp CTA — indigo accent matching price */}
              {whatsappLink && (
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noreferrer"
                  onClick={recordContact}
                  className="flex items-center justify-center gap-2.5 w-full bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white py-3.5 rounded-xl font-black text-sm transition-all shadow-lg shadow-indigo-600/20"
                >
                  <WhatsAppIcon size={17} />
                  Chat on WhatsApp
                </a>
              )}

              {/* Reveal contact */}
              {!showContact ? (
                <button
                  onClick={handleRevealContact}
                  className="flex items-center justify-center gap-2 w-full bg-slate-800 hover:bg-slate-700 active:scale-[0.98] text-white py-3 rounded-xl font-bold text-sm transition-all border border-slate-700/80"
                >
                  <Phone size={14} className="text-slate-400" />
                  Reveal Contact Info
                </button>
              ) : (
                <div className="space-y-2 animate-in slide-in-from-top-1 duration-200">
                  {phones.length === 0 && !whatsapp && (
                    <p className="text-slate-600 text-xs text-center py-2">
                      No contact details provided
                    </p>
                  )}
                  {phones.map((p, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 bg-slate-950 px-4 py-3 rounded-xl border border-slate-800"
                    >
                      <Phone size={14} className="text-slate-400 shrink-0" />
                      <span className="text-white text-sm font-medium">
                        +233 {p}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Report */}
            {!isOwnListing && (
              <div>
                <button
                  onClick={() => requireAuth(() => setShowReport(true))}
                  disabled={
                    reportStatus === "submitted" || reportStatus === "resolved"
                  }
                  className="flex items-center justify-between w-full bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-red-500/20 px-5 py-4 rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <div className="flex items-center gap-3">
                    <Flag
                      size={15}
                      className={
                        reportStatus
                          ? "text-amber-400"
                          : "text-slate-500 group-hover:text-red-400 transition-colors"
                      }
                    />
                    <div className="text-left">
                      <p
                        className={
                          "text-sm font-semibold " +
                          (reportStatus
                            ? "text-slate-300"
                            : "text-slate-400 group-hover:text-red-400 transition-colors")
                        }
                      >
                        {reportStatus === "submitted"
                          ? "Reported"
                          : reportStatus === "resolved"
                            ? "Report Reviewed"
                            : "Report this listing"}
                      </p>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        {reportStatus === "submitted"
                          ? "Under review"
                          : reportStatus === "resolved"
                            ? "Thank you for your report"
                            : "Help us keep the community safe."}
                      </p>
                    </div>
                  </div>
                  <ChevronRight
                    size={15}
                    className="text-slate-700 group-hover:text-slate-500 transition-colors shrink-0"
                  />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Suggested items */}
        <div className="mt-12">
          <SuggestedItems
            currentListingId={listingData.id}
            categoryId={listingData.category_id}
            sellerId={listingData.seller_id}
            onListingClick={onOpen}
          />
        </div>
      </div>

      {showReport && (
        <ReportModal
          listing={listingData}
          onClose={() => setShowReport(false)}
          onSuccess={() => setReportStatus("submitted")}
        />
      )}
    </>
  );
}
