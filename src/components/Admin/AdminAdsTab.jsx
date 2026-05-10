import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import {
  Plus, Pencil, Trash2, ToggleLeft, ToggleRight,
  ExternalLink, Megaphone, X, Check, MousePointerClick,
  Eye, Layout, Monitor, AlignCenter,
} from "lucide-react";

const SLOTS = [
  { key: "feed-top",   label: "Feed — Top Banner",        hint: "Above all listings on home page" },
  { key: "feed-mid-1", label: "Feed — Middle 1",          hint: "After 8th listing card" },
  { key: "feed-mid-2", label: "Feed — Middle 2",          hint: "After 16th listing card" },
  { key: "feed-mid-3", label: "Feed — Middle 3",          hint: "After 24th listing card" },
  { key: "listing-bottom", label: "Listing Detail — Bottom", hint: "Below listing detail" },
  { key: "interstitial",   label: "Interstitial Overlay",     hint: "Full-screen on first visit" },
  { key: null,         label: "Any Slot (random rotation)", hint: "Appears in any available slot" },
];

const EMPTY_FORM = {
  title: "", body: "", image_url: "", video_url: "",
  cta_url: "", cta_label: "Learn More",
  slot_key: "feed-top", starts_at: new Date().toISOString().slice(0, 16),
  ends_at: "", is_active: true, priority: 0,
};

export default function AdminAdsTab() {
  const [ads, setAds] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchAds(); }, []);

  const fetchAds = async () => {
    setLoading(true);
    const [{ data: adsData }, { data: events }] = await Promise.all([
      supabase.from("ads").select("*").order("created_at", { ascending: false }),
      supabase.from("ad_events").select("ad_id, kind"),
    ]);
    setAds(adsData || []);
    if (events) {
      const s = {};
      events.forEach(e => {
        if (!s[e.ad_id]) s[e.ad_id] = { impression: 0, click: 0, dismiss: 0 };
        s[e.ad_id][e.kind] = (s[e.ad_id][e.kind] || 0) + 1;
      });
      setStats(s);
    }
    setLoading(false);
  };

  const set = (key) => (val) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = async () => {
    if (!form?.title?.trim()) { alert("Ad title is required."); return; }
    setSaving(true);
    const payload = {
      title: form.title.trim(), body: form.body?.trim() || null,
      image_url: form.image_url?.trim() || null, video_url: form.video_url?.trim() || null,
      cta_url: form.cta_url?.trim() || null, cta_label: form.cta_label?.trim() || "Learn More",
      slot_key: form.slot_key || null,
      starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : new Date().toISOString(),
      ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
      is_active: Boolean(form.is_active), priority: Number(form.priority) || 0,
    };
    const { error } = form.id
      ? await supabase.from("ads").update(payload).eq("id", form.id)
      : await supabase.from("ads").insert(payload);
    if (error) { alert("Save failed: " + error.message); }
    else { setForm(null); await fetchAds(); }
    setSaving(false);
  };

  const toggleActive = async (ad) => {
    const next = !ad.is_active;
    setAds(prev => prev.map(a => a.id === ad.id ? { ...a, is_active: next } : a));
    const { error } = await supabase.from("ads").update({ is_active: next }).eq("id", ad.id);
    if (error) { alert("Update failed: " + error.message); fetchAds(); }
  };

  const deleteAd = async (id) => {
    if (!confirm("Delete this ad permanently? This cannot be undone.")) return;
    const { error } = await supabase.from("ads").delete().eq("id", id);
    if (error) { alert("Delete failed: " + error.message); return; }
    setAds(prev => prev.filter(a => a.id !== id));
  };

  const ctr = (id) => {
    const s = stats[id];
    if (!s?.impression) return "—";
    return ((s.click / s.impression) * 100).toFixed(1) + "%";
  };

  const slotLabel = (key) => SLOTS.find(s => s.key === key)?.label || (key ?? "Any Slot");

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-black text-main flex items-center gap-2"><Megaphone size={16} className="text-indigo-400" /> Ad Manager</h2>
          <p className="text-xs text-faint mt-0.5">{ads.filter(a => a.is_active).length} active · {ads.length} total</p>
        </div>
        <button onClick={() => setForm({ ...EMPTY_FORM })} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase rounded-xl transition-all shadow-md shadow-indigo-500/20">
          <Plus size={14} /> New Ad
        </button>
      </div>

      {/* Slot guide */}
      <div className="bg-surface border border-app rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
        <p className="col-span-full text-[10px] font-black uppercase tracking-widest text-faint mb-1">Available Slots</p>
        {SLOTS.filter(s => s.key).map(s => (
          <div key={s.key} className="flex items-start gap-2">
            <code className="text-[10px] text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded font-mono shrink-0 mt-0.5">{s.key}</code>
            <span className="text-xs text-faint">{s.hint}</span>
          </div>
        ))}
      </div>

      {/* Ads list */}
      {ads.length === 0 ? (
        <div className="text-center py-16 flex flex-col items-center gap-3">
          <Megaphone size={40} className="text-faint" />
          <p className="font-bold text-main">No ads yet</p>
          <p className="text-sm text-faint">Create your first ad to monetise the feed.</p>
        </div>
      ) : ads.map(ad => {
        const s = stats[ad.id] || {};
        const expired = ad.ends_at && new Date(ad.ends_at) < new Date();
        return (
          <div key={ad.id} className={`bg-surface border rounded-2xl overflow-hidden transition-opacity ${!ad.is_active || expired ? "opacity-60" : ""} ${expired ? "border-red-500/20" : "border-app"}`}>
            <div className="flex items-start gap-4 p-4">
              {/* Thumbnail */}
              {(ad.image_url || ad.video_url) && (
                <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-app bg-surface-2">
                  {ad.video_url
                    ? <video src={ad.video_url} className="w-full h-full object-cover" muted />
                    : <img src={ad.image_url} alt="" className="w-full h-full object-cover" />}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <p className="font-bold text-main text-sm">{ad.title}</p>
                    {ad.body && <p className="text-xs text-faint mt-0.5 line-clamp-1">{ad.body}</p>}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="text-[9px] font-black uppercase px-2 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">{slotLabel(ad.slot_key)}</span>
                      {expired && <span className="text-[9px] font-black uppercase px-2 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">Expired</span>}
                      {ad.cta_url && (
                        <a href={ad.cta_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] text-faint hover:text-main">
                          <ExternalLink size={9} /> {ad.cta_url.slice(0, 28)}…
                        </a>
                      )}
                    </div>
                  </div>
                  {/* Actions */}
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => toggleActive(ad)} className={`flex items-center gap-1.5 px-3 py-2 text-[10px] font-black uppercase rounded-xl border transition-all ${ad.is_active ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-surface-2 text-faint border-app"}`}>
                      {ad.is_active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                      {ad.is_active ? "Live" : "Off"}
                    </button>
                    <button onClick={() => setForm({ ...ad })} className="p-2 rounded-xl bg-surface-2 hover:bg-surface-3 text-faint hover:text-main border border-app transition-all" title="Edit">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => deleteAd(ad.id)} className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all" title="Delete">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                {/* Stats */}
                <div className="flex items-center gap-5 mt-3 pt-3 border-t border-app">
                  <Stat label="Impressions" value={s.impression ?? 0} icon={Eye} />
                  <Stat label="Clicks" value={s.click ?? 0} icon={MousePointerClick} />
                  <Stat label="Dismissed" value={s.dismiss ?? 0} />
                  <Stat label="CTR" value={ctr(ad.id)} highlight />
                  <span className="ml-auto text-[10px] text-faint">Priority {ad.priority ?? 0}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Create / Edit Modal */}
      {form && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-surface border border-app rounded-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-app shrink-0">
              <h3 className="font-black text-main">{form.id ? "Edit Ad" : "Create New Ad"}</h3>
              <button onClick={() => setForm(null)} className="p-1.5 rounded-xl hover:bg-surface-2 text-faint transition-colors"><X size={16} /></button>
            </div>

            <div className="overflow-y-auto p-5 space-y-4 flex-1">
              <F label="Title *"><In value={form.title} onChange={set("title")} placeholder="e.g. 20% off at Campus Café today" /></F>
              <F label="Body text" hint="Short tagline shown below title">
                <textarea value={form.body || ""} onChange={e => set("body")(e.target.value)} placeholder="Optional description or offer details…" rows={2}
                  className="w-full bg-surface-2 border border-app rounded-xl px-3 py-2.5 text-sm text-main placeholder-faint focus:outline-none focus:border-indigo-500/60 resize-none" />
              </F>
              <div className="grid grid-cols-2 gap-3">
                <F label="Image URL" hint="Ad thumbnail"><In value={form.image_url} onChange={set("image_url")} placeholder="https://…" /></F>
                <F label="Video URL" hint="Overrides image"><In value={form.video_url} onChange={set("video_url")} placeholder="https://…" /></F>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <F label="Link URL"><In value={form.cta_url} onChange={set("cta_url")} placeholder="https://…" /></F>
                <F label="Button text"><In value={form.cta_label} onChange={set("cta_label")} placeholder="Learn More" /></F>
              </div>
              <F label="Ad Slot">
                <select value={form.slot_key ?? ""} onChange={e => set("slot_key")(e.target.value || null)}
                  className="w-full bg-surface-2 border border-app rounded-xl px-3 py-2.5 text-sm text-main focus:outline-none focus:border-indigo-500/60">
                  {SLOTS.map(s => <option key={s.key ?? "null"} value={s.key ?? ""}>{s.label}</option>)}
                </select>
              </F>
              <div className="grid grid-cols-2 gap-3">
                <F label="Start date"><In type="datetime-local" value={form.starts_at || ""} onChange={set("starts_at")} /></F>
                <F label="End date" hint="Blank = no expiry"><In type="datetime-local" value={form.ends_at || ""} onChange={set("ends_at")} /></F>
              </div>
              <F label="Priority" hint="Higher = shown first when competing"><In type="number" value={form.priority ?? 0} onChange={v => set("priority")(Number(v))} min={0} max={100} /></F>

              <div className="flex items-center justify-between bg-surface-2 border border-app rounded-xl px-4 py-3">
                <div><p className="text-sm font-bold text-main">Active</p><p className="text-xs text-faint">Show this ad to users immediately</p></div>
                <button onClick={() => set("is_active")(!form.is_active)} className={`relative w-11 h-6 rounded-full transition-all ${form.is_active ? "bg-indigo-600" : "bg-surface-3 border border-app"}`}>
                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.is_active ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>
            </div>

            <div className="flex gap-3 px-5 py-4 border-t border-app shrink-0">
              <button onClick={() => setForm(null)} className="flex-1 py-2.5 rounded-xl bg-surface-2 hover:bg-surface-3 text-muted text-sm font-bold border border-app transition-all">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-black transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check size={15} />}
                {form.id ? "Save Changes" : "Create Ad"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const F = ({ label, children, hint }) => (
  <div>
    <label className="block text-[10px] font-black uppercase tracking-widest text-faint mb-1.5">{label}</label>
    {children}
    {hint && <p className="text-[10px] text-faint mt-1">{hint}</p>}
  </div>
);

const In = ({ value, onChange, placeholder, type = "text", ...rest }) => (
  <input type={type} value={value || ""} onChange={e => onChange(e.target.value)} placeholder={placeholder}
    className="w-full bg-surface-2 border border-app rounded-xl px-3 py-2.5 text-sm text-main placeholder-faint focus:outline-none focus:border-indigo-500/60 transition-colors"
    {...rest} />
);

const Stat = ({ label, value, icon: Icon, highlight }) => (
  <div>
    <div className="flex items-center gap-1">
      {Icon && <Icon size={10} className="text-faint" />}
      <p className={`text-sm font-black ${highlight ? "text-indigo-400" : "text-main"}`}>{value}</p>
    </div>
    <p className="text-[9px] text-faint uppercase">{label}</p>
  </div>
);
