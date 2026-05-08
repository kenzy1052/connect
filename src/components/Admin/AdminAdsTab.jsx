import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import {
  Plus, Pencil, Trash2, ToggleLeft, ToggleRight,
  ExternalLink, BarChart2, X, Check, Image, Video, Megaphone
} from "lucide-react";

const SLOTS = [
  { key: "feed-top", label: "🏠 Feed Top (above listings)" },
  { key: "feed-mid-1", label: "📋 Feed Mid #1 (after 8 items)" },
  { key: "feed-mid-2", label: "📋 Feed Mid #2 (after 16 items)" },
  { key: "feed-mid-3", label: "📋 Feed Mid #3 (after 24 items)" },
  { key: "listing-bottom", label: "📄 Listing Detail — Bottom" },
  { key: "interstitial", label: "🖥 Interstitial (Full-Screen Overlay)" },
  { key: null, label: "🎲 Any Slot (rotates into all)" },
];

const EMPTY_FORM = {
  title: "",
  body: "",
  image_url: "",
  video_url: "",
  cta_url: "",
  cta_label: "Learn More",
  slot_key: "feed-top",
  starts_at: new Date().toISOString().slice(0, 16),
  ends_at: "",
  is_active: true,
  priority: 0,
};

function Field({ label, children, hint }) {
  return (
    <div>
      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
        {label}
      </label>
      {children}
      {hint && <p className="text-[10px] text-slate-600 mt-1">{hint}</p>}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text", ...rest }) {
  return (
    <input
      type={type}
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/60 transition-colors"
      {...rest}
    />
  );
}

function Textarea({ value, onChange, placeholder, rows = 2 }) {
  return (
    <textarea
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/60 transition-colors resize-none"
    />
  );
}

export default function AdminAdsTab() {
  const [ads, setAds] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null); // null = closed
  const [saving, setSaving] = useState(false);
  const [previewAd, setPreviewAd] = useState(null);

  useEffect(() => {
    fetchAds();
  }, []);

  const fetchAds = async () => {
    setLoading(true);
    const [{ data: adsData }, { data: events }] = await Promise.all([
      supabase.from("ads").select("*").order("created_at", { ascending: false }),
      supabase.from("ad_events").select("ad_id, kind"),
    ]);

    setAds(adsData || []);

    // Aggregate event counts per ad
    if (events) {
      const s = {};
      events.forEach((e) => {
        if (!s[e.ad_id]) s[e.ad_id] = { impression: 0, click: 0, dismiss: 0 };
        s[e.ad_id][e.kind] = (s[e.ad_id][e.kind] || 0) + 1;
      });
      setStats(s);
    }
    setLoading(false);
  };

  const setField = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSave = async () => {
    if (!form?.title?.trim()) { alert("Ad title is required."); return; }
    setSaving(true);

    const payload = {
      title: form.title.trim(),
      body: form.body?.trim() || null,
      image_url: form.image_url?.trim() || null,
      video_url: form.video_url?.trim() || null,
      cta_url: form.cta_url?.trim() || null,
      cta_label: form.cta_label?.trim() || "Learn More",
      slot_key: form.slot_key || null,
      starts_at: form.starts_at
        ? new Date(form.starts_at).toISOString()
        : new Date().toISOString(),
      ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
      is_active: Boolean(form.is_active),
      priority: Number(form.priority) || 0,
    };

    let error;
    if (form.id) {
      ({ error } = await supabase.from("ads").update(payload).eq("id", form.id));
    } else {
      ({ error } = await supabase.from("ads").insert(payload));
    }

    if (error) {
      alert("Save failed: " + error.message);
    } else {
      setForm(null);
      await fetchAds();
    }
    setSaving(false);
  };

  const toggleActive = async (ad) => {
    const newActive = !ad.is_active;
    setAds((prev) => prev.map((a) => (a.id === ad.id ? { ...a, is_active: newActive } : a)));
    await supabase.from("ads").update({ is_active: newActive }).eq("id", ad.id);
  };

  const deleteAd = async (id) => {
    if (!confirm("Delete this ad permanently? This cannot be undone.")) return;
    await supabase.from("ads").delete().eq("id", id);
    setAds((prev) => prev.filter((a) => a.id !== id));
  };

  const ctr = (adId) => {
    const s = stats[adId];
    if (!s || !s.impression) return "—";
    return ((s.click / s.impression) * 100).toFixed(1) + "%";
  };

  const slotLabel = (key) => SLOTS.find((s) => s.key === key)?.label || key || "Any";

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <Megaphone size={18} className="text-indigo-400" /> Ad Manager
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {ads.length} ad{ads.length !== 1 ? "s" : ""} total ·{" "}
            {ads.filter((a) => a.is_active).length} active
          </p>
        </div>
        <button
          onClick={() => setForm({ ...EMPTY_FORM })}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-black uppercase rounded-xl transition-all"
        >
          <Plus size={14} /> New Ad
        </button>
      </div>

      {/* ── Ad slots legend ── */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">
          Available Slots
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {SLOTS.filter((s) => s.key).map((s) => (
            <div key={s.key} className="flex items-center gap-2 text-xs text-slate-400">
              <span className="font-mono text-indigo-400 text-[10px] bg-indigo-500/10 px-1.5 py-0.5 rounded">
                {s.key}
              </span>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Ads list ── */}
      {ads.length === 0 ? (
        <div className="text-center py-16">
          <Megaphone size={40} className="text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500 font-bold">No ads yet</p>
          <p className="text-slate-600 text-sm mt-1">Create your first ad to start monetising.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {ads.map((ad) => {
            const s = stats[ad.id] || {};
            const isExpired = ad.ends_at && new Date(ad.ends_at) < new Date();
            return (
              <div
                key={ad.id}
                className={`bg-slate-900 border rounded-2xl p-4 transition-opacity ${
                  !ad.is_active || isExpired ? "opacity-50" : ""
                } ${isExpired ? "border-red-500/20" : "border-slate-800"}`}
              >
                <div className="flex items-start gap-4">
                  {/* Media thumbnail */}
                  {(ad.image_url || ad.video_url) && (
                    <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 border border-slate-800 bg-slate-800">
                      {ad.video_url ? (
                        <video src={ad.video_url} className="w-full h-full object-cover" muted />
                      ) : (
                        <img src={ad.image_url} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="min-w-0">
                        <p className="font-bold text-white text-sm truncate">{ad.title}</p>
                        {ad.body && (
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{ad.body}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                            {slotLabel(ad.slot_key)}
                          </span>
                          {isExpired && (
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                              Expired
                            </span>
                          )}
                          {ad.cta_url && (
                            <a
                              href={ad.cta_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[9px] text-slate-500 hover:text-slate-300 flex items-center gap-0.5"
                            >
                              <ExternalLink size={9} /> {ad.cta_url.slice(0, 30)}…
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => toggleActive(ad)}
                          className={`p-1.5 rounded-lg border transition-all text-[10px] font-black uppercase flex items-center gap-1 ${
                            ad.is_active
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                              : "bg-slate-800 text-slate-500 border-slate-700 hover:text-slate-300"
                          }`}
                          title={ad.is_active ? "Deactivate" : "Activate"}
                        >
                          {ad.is_active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                          {ad.is_active ? "Live" : "Off"}
                        </button>
                        <button
                          onClick={() => setForm({ ...ad })}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-all"
                          title="Edit"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => deleteAd(ad.id)}
                          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all"
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Stats row */}
                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-800/50">
                      <Stat label="Impressions" value={s.impression || 0} />
                      <Stat label="Clicks" value={s.click || 0} />
                      <Stat label="Dismisses" value={s.dismiss || 0} />
                      <Stat label="CTR" value={ctr(ad.id)} highlight />
                      <div className="ml-auto text-[10px] text-slate-600">
                        Priority: {ad.priority ?? 0}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Create / Edit Form Modal ── */}
      {form && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl overflow-y-auto max-h-[90vh]">
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
              <h3 className="font-black text-white">
                {form.id ? "Edit Ad" : "New Ad"}
              </h3>
              <button
                onClick={() => setForm(null)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <Field label="Title *">
                <Input value={form.title} onChange={setField("title")} placeholder="e.g. Get 20% off at Campus Café" />
              </Field>

              <Field label="Body text" hint="Optional tagline shown below the title">
                <Textarea value={form.body} onChange={setField("body")} placeholder="Short description or offer details…" />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Image URL" hint="Shown as ad thumbnail">
                  <Input value={form.image_url} onChange={setField("image_url")} placeholder="https://…" />
                </Field>
                <Field label="Video URL" hint="Overrides image if set">
                  <Input value={form.video_url} onChange={setField("video_url")} placeholder="https://…" />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="CTA URL">
                  <Input value={form.cta_url} onChange={setField("cta_url")} placeholder="https://…" />
                </Field>
                <Field label="CTA Button Label">
                  <Input value={form.cta_label} onChange={setField("cta_label")} placeholder="Learn More" />
                </Field>
              </div>

              <Field label="Ad Slot" hint="Where this ad appears in the app">
                <select
                  value={form.slot_key ?? ""}
                  onChange={(e) => setField("slot_key")(e.target.value || null)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/60"
                >
                  {SLOTS.map((s) => (
                    <option key={s.key ?? "null"} value={s.key ?? ""}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Start date / time">
                  <Input type="datetime-local" value={form.starts_at || ""} onChange={setField("starts_at")} />
                </Field>
                <Field label="End date / time" hint="Leave blank = no expiry">
                  <Input type="datetime-local" value={form.ends_at || ""} onChange={setField("ends_at")} />
                </Field>
              </div>

              <Field label="Priority" hint="Higher = shown first when multiple ads compete for same slot">
                <Input type="number" value={form.priority ?? 0} onChange={(v) => setField("priority")(Number(v))} min={0} max={100} />
              </Field>

              {/* Active toggle */}
              <div className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-xl px-4 py-3">
                <div>
                  <p className="text-sm font-bold text-white">Active</p>
                  <p className="text-xs text-slate-500">Show this ad to users</p>
                </div>
                <button
                  onClick={() => setField("is_active")(!form.is_active)}
                  className={`relative w-10 h-6 rounded-full transition-all ${form.is_active ? "bg-indigo-600" : "bg-slate-700"}`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.is_active ? "translate-x-5" : "translate-x-1"}`}
                  />
                </button>
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex gap-3 px-5 py-4 border-t border-slate-800 sticky bottom-0 bg-slate-900">
              <button
                onClick={() => setForm(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-bold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-black transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Check size={15} />
                )}
                {form.id ? "Save Changes" : "Create Ad"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, highlight }) {
  return (
    <div>
      <p className={`text-sm font-black ${highlight ? "text-indigo-400" : "text-white"}`}>
        {value}
      </p>
      <p className="text-[9px] text-slate-600 uppercase">{label}</p>
    </div>
  );
}
