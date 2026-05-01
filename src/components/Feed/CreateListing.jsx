import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { compressImage } from "../../utils/compressImage";
import Cropper from "react-easy-crop";
import { getCroppedSquareBlob } from "../../utils/cropImage";
import { supabase } from "../../lib/supabaseClient";
import {
  AlertTriangle, ArrowRight, BadgeCheck, CheckCircle2, ChevronDown,
  ImagePlus, Info, Lightbulb, Loader2, Package, ShieldCheck,
  Sparkles, Star, Tag, Wrench, X, Zap,
} from "lucide-react";
import { cleanTitle, cleanDescription } from "../../utils/text";

/* ─── Atoms ────────────────────────────────────────────────────────── */
function ProTip({ icon: Icon = Lightbulb, children }) {
  return (
    <div className="flex items-start gap-2.5 bg-brand-soft border border-[hsl(var(--primary)/0.25)] rounded-md px-3.5 py-2.5">
      <Icon className="w-3.5 h-3.5 text-brand mt-0.5 shrink-0" />
      <p className="text-[11px] text-main/80 leading-relaxed">{children}</p>
    </div>
  );
}

function StepHeader({ num, title, hint }) {
  return (
    <div className="flex items-start gap-3 mb-3">
      <span className="w-7 h-7 grid place-items-center rounded-md bg-brand text-[hsl(var(--primary-fg))] text-xs font-bold shrink-0">
        {num}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-main">{title}</p>
        {hint && <p className="text-[11px] text-faint mt-0.5">{hint}</p>}
      </div>
    </div>
  );
}

function FormSection({ children }) {
  return (
    <section className="border border-app rounded-md bg-surface px-5 py-5 space-y-4">
      {children}
    </section>
  );
}

function ContactGateBanner({ onGoToSettings, onDismiss }) {
  return (
    <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-4" >
      <div className="flex items-start gap-3">
        <span className="w-7 h-7 rounded-md bg-amber-500/20 text-amber-600 dark:text-amber-300 grid place-items-center shrink-0">
          <AlertTriangle className="w-3.5 h-3.5" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-700 dark:text-amber-200">
            Contact info required before publishing
          </p>
          <p className="text-xs text-amber-700/80 dark:text-amber-200/70 mt-1 leading-relaxed">
            Buyers need a way to reach you. Add a phone or WhatsApp number first.
          </p>
          <button
            type="button"
            onClick={onGoToSettings}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-200 bg-amber-500/15 hover:bg-amber-500/25 px-3 py-1.5 rounded-sm transition-colors"
          >
            Open settings <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        <button onClick={onDismiss} className="text-faint hover:text-main">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function ImagePreview({ files, coverIndex, setCoverIndex, onRemove }) {
  if (!files.length) return null;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-wider text-faint">
          {files.length} image{files.length > 1 ? "s" : ""} ·{" "}
          {(files.reduce((s, f) => s + f.size, 0) / 1024).toFixed(0)} KB
        </p>
        {files.length > 1 && (
          <p className="text-[11px] text-faint">Tap to set cover</p>
        )}
      </div>
      <div className="flex gap-3 flex-wrap">
        {files.map((file, i) => (
          <div key={i} className={`relative group w-24 h-24 rounded-md overflow-hidden border-2 cursor-pointer transition-colors ${ i === coverIndex ? "border-[hsl(var(--primary))]" : "border-app hover:border-[hsl(var(--text-faint))]" }`} onClick={() => setCoverIndex(i)} >
            <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onRemove(i); }}
              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity grid place-items-center"
            >
              <X className="w-3 h-3" />
            </button>
            {i === coverIndex && (
              <div className="absolute bottom-0 inset-x-0 py-1 flex items-center justify-center gap-1 text-[9px] font-bold uppercase tracking-wider bg-brand text-[hsl(var(--primary-fg))]">
                <Star className="w-2.5 h-2.5" /> Cover
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Main ─────────────────────────────────────────────────────────── */
export function CreateListing({ user, onCancel, onSuccess }) {
  const navigate = useNavigate();
  const MAX_IMAGES = 3;

  const [formData, setFormData] = useState({
    title: "", description: "", listing_type: "product",
    price: "", price_min: "", price_max: "",
    category_id: "", condition: "", negotiable: false,
  });

  const [images, setImages] = useState([]);
  const [coverIndex, setCoverIndex] = useState(0);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [contactGate, setContactGate] = useState(false);

  const [pendingCrop, setPendingCrop] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  useEffect(() => {
    const CACHE_KEY = "cc.categories.v1";
    const ONE_HOUR = 60 * 60 * 1000;
    async function fetchCategories() {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        try {
          const { ts, data } = JSON.parse(cached);
          if (Date.now() - ts < ONE_HOUR) {
            setCategories(data); setLoading(false); return;
          }
        } catch { /* ignore */ }
      }
      const { data, error } = await supabase.from("categories").select("*");
      if (!error && data) {
        setCategories(data);
        localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
      }
      setLoading(false);
    }
    fetchCategories();
  }, []);

  const handleImageChange = async (e) => {
    const incoming = Array.from(e.target.files);
    e.target.value = "";
    if (!incoming.length) return;
    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) return toast.error(`Maximum ${MAX_IMAGES} photos.`);
    const accepted = incoming.slice(0, remaining);
    if (incoming.length > remaining) toast.error(`Only ${remaining} more allowed.`);
    for (const f of accepted) {
      if (f.size > 15 * 1024 * 1024) { toast.error(`"${f.name}" is over 15 MB.`); continue; }
      setPendingCrop({ file: f, previewUrl: URL.createObjectURL(f) });
      return;
    }
  };

  const onCropComplete = (_, areaPx) => setCroppedAreaPixels(areaPx);

  const confirmCrop = async () => {
    if (!pendingCrop || !croppedAreaPixels) return;
    try {
      const blob = await getCroppedSquareBlob(pendingCrop.file, croppedAreaPixels);
      if (!blob) throw new Error("Crop failed");
      const compressed = await compressImage(
        new File([blob], pendingCrop.file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" })
      );
      setImages((prev) => [...prev, compressed]);
    } catch (err) {
      console.error(err); toast.error("Could not crop image.");
    } finally {
      URL.revokeObjectURL(pendingCrop.previewUrl);
      setPendingCrop(null); setCrop({ x: 0, y: 0 }); setZoom(1); setCroppedAreaPixels(null);
    }
  };

  const cancelCrop = () => {
    if (pendingCrop?.previewUrl) URL.revokeObjectURL(pendingCrop.previewUrl);
    setPendingCrop(null); setCroppedAreaPixels(null);
  };

  const removeImage = (index) => {
    setImages((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (coverIndex >= next.length) setCoverIndex(Math.max(0, next.length - 1));
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    const title = cleanTitle(formData.title);
    const description = cleanDescription(formData.description);
    if (title.length < 3) return toast.error("Title must be at least 3 characters");
    if (!formData.category_id) return toast.error("Select a category");
    if (formData.listing_type === "product" && !formData.condition)
      return toast.error("Select item condition");
    if (images.length === 0) return toast.error("Upload at least 1 image");
    if (formData.listing_type === "product" && !formData.price && !formData.negotiable)
      return toast.error("Enter a price or mark as negotiable");

    setSubmitting(true); setContactGate(false);
    let createdListingId = null;
    const uploadedPaths = [];
    try {
      const { data: contacts, error: contactError } = await supabase
        .from("contact_numbers").select("type, is_primary").eq("user_id", user.id);
      if (contactError) { toast.error("Failed to verify contact info."); setSubmitting(false); return; }
      const hasContact = contacts.some((c) => c.type === "phone" || c.type === "whatsapp");
      if (!hasContact) {
        setContactGate(true); setSubmitting(false);
        setTimeout(() => {
          document.getElementById("contact-gate-banner")
            ?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 100);
        return;
      }

      const { data: listing, error: listingError } = await supabase
        .from("listings").insert([{
          title, description,
          type: formData.listing_type,
          category_id: formData.category_id,
          seller_id: user.id, is_active: false,
          condition: formData.listing_type === "product" ? formData.condition : null,
          price: formData.listing_type === "product" && formData.price ? parseFloat(formData.price) : null,
          price_min: formData.listing_type === "service" && formData.price_min ? parseFloat(formData.price_min) : null,
          price_max: formData.listing_type === "service" && formData.price_max ? parseFloat(formData.price_max) : null,
          negotiable: formData.listing_type === "product" ? formData.negotiable : false,
        }]).select().single();
      if (listingError || !listing) throw new Error(listingError?.message || "Listing insert failed");
      createdListingId = listing.id;

      const safeCover = Math.min(coverIndex, images.length - 1);
      const imageRows = [];
      for (let i = 0; i < images.length; i++) {
        const file = images[i];
        const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5);
        const filePath = `${user.id}/${listing.id}/${i}-${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("listing-images")
          .upload(filePath, file, { contentType: file.type, cacheControl: "31536000", upsert: false });
        if (uploadError) throw new Error("Image upload failed: " + uploadError.message);
        uploadedPaths.push(filePath);
        const { data: pub } = supabase.storage.from("listing-images").getPublicUrl(filePath);
        if (!pub?.publicUrl) throw new Error("Failed to generate image URL");
        imageRows.push({ listing_id: listing.id, image_url: pub.publicUrl, position: i + 1, is_cover: i === safeCover });
      }
      const { error: imageError } = await supabase.from("listing_images").insert(imageRows);
      if (imageError) throw new Error("DB insert failed: " + imageError.message);
      const { error: activateError } = await supabase
        .from("listings").update({ is_active: true }).eq("id", listing.id);
      if (activateError) throw new Error("Activation failed: " + activateError.message);
      onSuccess();
    } catch (err) {
      console.error("CREATE LISTING ERROR:", err);
      if (uploadedPaths.length > 0) await supabase.storage.from("listing-images").remove(uploadedPaths);
      if (createdListingId) await supabase.from("listings").delete().eq("id", createdListingId);
      toast.error(err.message || "Failed to create listing");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-7 h-7 text-brand animate-spin" />
      </div>
    );
  }

  const filteredCategories = categories.filter((c) => c.type === formData.listing_type);

  return (
    <div className="max-w-2xl mx-auto" >
      {/* Header */}
      <header className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-faint">New listing</p>
            <h1 className="mt-1 text-2xl md:text-3xl font-bold text-main tracking-tight">
              Publish to the marketplace
            </h1>
            <p className="mt-2 text-sm text-muted max-w-md">
              Fill out the steps below — buyers see clear, honest listings perform best.
            </p>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 bg-brand-soft text-brand px-2.5 py-1 rounded-sm text-[10px] font-semibold uppercase tracking-wider shrink-0">
            <ShieldCheck className="w-3 h-3" /> Verified
          </span>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-5">
        {contactGate && (
          <div id="contact-gate-banner">
            <ContactGateBanner
              onGoToSettings={() => navigate("/account/numbers")}
              onDismiss={() => setContactGate(false)}
            />
          </div>
        )}

        {/* Step 1 — Type */}
        <FormSection>
          <StepHeader num={1} title="What are you listing?" hint="Pick the closest match." />
          <div className="grid grid-cols-2 gap-2 p-1 bg-app rounded-md border border-app">
            {[
              { value: "product", label: "Product", icon: Package },
              { value: "service", label: "Service", icon: Wrench },
            ].map(({ value, label, icon: Icon }) => {
              const active = formData.listing_type === value;
              return (
                <button
                  type="button"
                  key={value}
                  onClick={() => setFormData({
                    ...formData, listing_type: value, price: "", price_min: "", price_max: "", condition: "",
                  })}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-sm text-xs font-semibold uppercase tracking-wider transition-colors ${
                    active ? "bg-brand text-[hsl(var(--primary-fg))]" : "text-muted hover:text-main"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              );
            })}
          </div>
        </FormSection>

        {/* Step 2 — Title + Desc */}
        <FormSection>
          <StepHeader num={2} title="Tell buyers what it is" hint="Specific titles get 3× more clicks." />
          <Input
            label="Title"
            placeholder={formData.listing_type === "product"
              ? "e.g. Vintage Polaroid Camera, barely used"
              : "e.g. Professional Logo Design & Branding"}
            value={formData.title}
            onChange={(v) => setFormData({ ...formData, title: v })}
          />
          <Textarea
            label="Description"
            rows={4}
            placeholder={formData.listing_type === "product"
              ? "Brand, size, age, any defects, reason for selling…"
              : "What's included, turnaround time, examples of past work…"}
            value={formData.description}
            onChange={(v) => setFormData({ ...formData, description: v })}
          />
        </FormSection>

        {/* Step 3 — Category */}
        <FormSection>
          <StepHeader num={3} title="Category" hint="Helps buyers discover your listing." />
          <div className="relative">
            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-faint pointer-events-none" />
            <select
              value={formData.category_id}
              onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
              className="w-full bg-app border border-app rounded-md pl-10 pr-9 py-2.5 text-sm text-main appearance-none outline-none focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary)/0.18)] transition-all"
            >
              <option value="">Select a category</option>
              {filteredCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-faint pointer-events-none" />
          </div>
        </FormSection>

        {/* Step 4 — Condition (products) */}
        {formData.listing_type === "product" && (
          <FormSection>
            <StepHeader num={4} title="Condition" hint="Be honest — buyers reward transparency." />
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: "new", label: "New", desc: "Unused · original packaging", icon: BadgeCheck },
                { value: "used", label: "Used", desc: "Pre-owned · may show wear", icon: Zap },
              ].map(({ value, label, desc, icon: Icon }) => {
                const active = formData.condition === value;
                return (
                  <button type="button" key={value} onClick={() => setFormData({ ...formData, condition: value })} className={`flex flex-col items-start gap-1.5 p-3.5 rounded-md border-2 text-left transition-colors ${ active ? "bg-brand-soft border-[hsl(var(--primary))]" : "bg-app border-app hover:border-[hsl(var(--text-faint))]" }`} >
                    <div className="flex items-center gap-2 w-full">
                      <Icon className={`w-4 h-4 ${active ? "text-brand" : "text-faint"}`} />
                      <span className={`text-xs font-semibold uppercase tracking-wider ${active ? "text-main" : "text-muted"}`}>
                        {label}
                      </span>
                      {active && <CheckCircle2 className="w-3.5 h-3.5 text-brand ml-auto" />}
                    </div>
                    <p className="text-[11px] text-faint ml-6">{desc}</p>
                  </button>
                );
              })}
            </div>
            <ProTip icon={Info}>Buyers filter by condition. Accurate listings build trust.</ProTip>
          </FormSection>
        )}

        {/* Step 5 — Pricing */}
        <FormSection>
          <StepHeader
            num={formData.listing_type === "product" ? 5 : 4}
            title="Pricing"
            hint={formData.listing_type === "product" ? "Set a fair price or mark as negotiable." : "Set a price range for your service."}
          />

          {formData.listing_type === "product" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <PriceInput
                value={formData.price}
                onChange={(v) => setFormData({ ...formData, price: v })}
                placeholder="0.00"
              />
              <label className="flex items-center gap-2.5 cursor-pointer w-max select-none">
                <span className="relative inline-flex">
                  <input
                    type="checkbox"
                    checked={formData.negotiable}
                    onChange={(e) => setFormData({ ...formData, negotiable: e.target.checked })}
                    className="peer sr-only"
                  />
                  <span className="w-9 h-5 bg-app border border-app rounded-full peer-checked:bg-brand peer-checked:border-[hsl(var(--primary))] transition-colors" />
                  <span className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
                </span>
                <span className="text-xs font-medium text-muted uppercase tracking-wider">
                  Negotiable
                </span>
              </label>
            </div>
          )}

          {formData.listing_type === "service" && (
            <div className="grid grid-cols-2 gap-3">
              <PriceInput
                value={formData.price_min}
                onChange={(v) => setFormData({ ...formData, price_min: v })}
                placeholder="Min"
              />
              <PriceInput
                value={formData.price_max}
                onChange={(v) => setFormData({ ...formData, price_max: v })}
                placeholder="Max"
              />
            </div>
          )}
          <ProTip>
            {formData.listing_type === "product"
              ? "Research similar listings. Competitive pricing → 3× faster responses."
              : "A clear price range filters time-wasters and attracts serious clients."}
          </ProTip>
        </FormSection>

        {/* Step 6 — Photos */}
        <FormSection>
          <StepHeader
            num={formData.listing_type === "product" ? 6 : 5}
            title="Photos"
            hint="Up to 3 images. The first one becomes the cover."
          />

          <label className="flex items-center gap-3 cursor-pointer w-full bg-app border-2 border-dashed border-app hover:border-[hsl(var(--primary)/0.5)] hover:bg-brand-soft rounded-md p-4 transition-colors group">
            <span className="w-10 h-10 rounded-md bg-brand-soft text-brand grid place-items-center shrink-0">
              <ImagePlus className="w-4 h-4" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-medium text-main">
                {images.length > 0 ? `${images.length} of 3 photos added` : "Upload up to 3 photos"}
              </span>
              <span className="block text-[11px] text-faint mt-0.5">JPG, PNG, WEBP · max 15 MB each</span>
            </span>
            {images.length > 0
              ? <CheckCircle2 className="w-5 h-5 text-brand shrink-0" />
              : <span className="text-[10px] font-semibold uppercase tracking-wider text-faint">Browse</span>}
            <input
              type="file" multiple accept="image/*"
              onChange={handleImageChange}
              disabled={images.length >= MAX_IMAGES}
              className="sr-only"
            />
          </label>

          <ImagePreview
            files={images}
            coverIndex={coverIndex}
            setCoverIndex={setCoverIndex}
            onRemove={removeImage}
          />
        </FormSection>

        {/* Footer */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 text-sm font-semibold text-muted hover:text-main border border-app hover:border-[hsl(var(--text-faint))] rounded-md transition-colors"
          >
            Cancel
          </button>
          <button type="submit" disabled={submitting} className="flex-[2] inline-flex items-center justify-center gap-2 bg-brand text-[hsl(var(--primary-fg))] py-3 rounded-md text-sm font-bold transition-all disabled:opacity-50 hover:brightness-110" >
            {submitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Publishing…</>
            ) : (
              <><Sparkles className="w-4 h-4" /> Publish listing</>
            )}
          </button>
        </div>
      </form>

      {/* Cropper modal */}
      
        {pendingCrop && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" >
            <div className="bg-surface border border-app rounded-md w-full max-w-md overflow-hidden" >
              <div className="px-4 py-3 border-b border-app flex justify-between items-center">
                <p className="text-xs font-semibold uppercase tracking-wider text-main">
                  Crop to 1:1
                </p>
                <button onClick={cancelCrop} className="text-faint hover:text-main">
                  <X size={16} />
                </button>
              </div>
              <div className="relative w-full h-72 bg-black">
                <Cropper
                  image={pendingCrop.previewUrl} crop={crop} zoom={zoom} aspect={1}
                  onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onCropComplete}
                />
              </div>
              <div className="px-4 pt-3">
                <input
                  type="range" min={1} max={3} step={0.05}
                  value={zoom} onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full accent-[hsl(var(--primary))]"
                />
              </div>
              <div className="p-4 flex gap-2">
                <button
                  type="button" onClick={cancelCrop}
                  className="flex-1 py-2.5 rounded-md text-xs font-semibold text-muted bg-app hover:text-main border border-app"
                >Cancel</button>
                <button
                  type="button" onClick={confirmCrop}
                  className="flex-1 py-2.5 rounded-md text-xs font-semibold text-[hsl(var(--primary-fg))] bg-brand hover:brightness-110"
                >Use this crop</button>
              </div>
            </div>
          </div>
        )}
      
    </div>
  );
}

/* ─── Small inputs ─────────────────────────────────────────────────── */
function Input({ label, value, onChange, placeholder }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-app border border-app rounded-md py-2.5 px-3 text-sm text-main placeholder:text-faint focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary)/0.18)] outline-none transition-all"
      />
    </div>
  );
}

function Textarea({ label, value, onChange, placeholder, rows = 3 }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted">{label}</label>
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-app border border-app rounded-md py-2.5 px-3 text-sm text-main placeholder:text-faint focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary)/0.18)] outline-none transition-all resize-none"
      />
    </div>
  );
}

function PriceInput({ value, onChange, placeholder }) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-faint text-xs font-semibold pointer-events-none">
        GH₵
      </span>
      <input
        type="number" inputMode="decimal"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-app border border-app rounded-md pl-12 pr-3 py-2.5 text-sm text-main placeholder:text-faint focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary)/0.18)] outline-none transition-all"
      />
    </div>
  );
}
