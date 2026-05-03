import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { useAuth } from "../../../context/AuthContext";
import {
  Phone,
  MessageCircle,
  Loader2,
  CheckCircle2,
  PhoneCall,
} from "lucide-react";
import { SettingsHeader, SettingsSection } from "../SettingsPrimitives";
import { useToast } from "../../../context/ToastContext";

const validatePhone = (num) => {
  if (!num) return true;
  const digits = num.replace(/\D/g, "");
  return digits.startsWith("0") ? digits.length === 10 : digits.length === 9;
};
const normalizePhone = (num) => {
  let digits = num.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = digits.slice(1);
  if (digits.startsWith("233")) digits = digits.slice(3);
  return digits;
};
const formatPhoneForDisplay = (num) => (num ? "0" + num : "");

function PhoneInput({ value, onChange, placeholder, icon: Icon }) {
  const handleChange = (raw) => {
    let digits = raw.replace(/\D/g, "");
    digits = digits.startsWith("0") ? digits.slice(0, 10) : digits.slice(0, 9);
    onChange(digits);
  };
  return (
    <div className="flex rounded-md overflow-hidden border border-app focus-within:border-[hsl(var(--primary))] focus-within:ring-2 focus-within:ring-[hsl(var(--primary)/0.18)] transition-all bg-app">
      <div className="px-3 flex items-center gap-1.5 bg-surface-2 text-muted text-sm font-medium border-r border-app shrink-0">
        {Icon && <Icon size={14} />}
        <span>+233</span>
      </div>
      <input
        type="tel"
        inputMode="numeric"
        placeholder={placeholder}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        className="flex-1 px-3 py-2.5 bg-transparent text-main outline-none placeholder:text-faint text-sm"
      />
    </div>
  );
}

function Field({ label, hint, required, children }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted flex items-center gap-1">
        {label}
        {required && <span className="text-[hsl(var(--danger))] text-xs">*</span>}
        {!required && <span className="text-faint text-[10px] font-normal">(optional)</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] text-faint">{hint}</p>}
    </div>
  );
}

export default function NumbersTab() {
  const { user } = useAuth();
  const toast = useToast();
  const [whatsapp, setWhatsapp] = useState("");
  const [primaryPhone, setPrimaryPhone] = useState("");
  const [secondaryPhone, setSecondaryPhone] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchContacts = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("contact_numbers")
      .select("*")
      .eq("user_id", user.id);
    if (!data) return;
    const wa = data.find((c) => c.type === "whatsapp");
    const primary = data.find((c) => c.type === "phone" && c.is_primary);
    const secondary = data.find((c) => c.type === "phone" && !c.is_primary);
    if (wa) setWhatsapp(formatPhoneForDisplay(wa.phone_number));
    if (primary) setPrimaryPhone(formatPhoneForDisplay(primary.phone_number));
    if (secondary) setSecondaryPhone(formatPhoneForDisplay(secondary.phone_number));
  }, [user]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // Returns true on success, throws on failure
  const upsertContact = async (existing, type, isPrimary, value) => {
    const trimmed = value.trim();
    if (!trimmed) {
      if (existing) {
        const { error } = await supabase.from("contact_numbers").delete().eq("id", existing.id);
        if (error) throw new Error(`Failed to remove ${type} number: ${error.message}`);
      }
      return;
    }
    const normalized = normalizePhone(trimmed);
    if (existing) {
      const { error } = await supabase
        .from("contact_numbers")
        .update({ phone_number: normalized, is_primary: isPrimary ?? existing.is_primary })
        .eq("id", existing.id);
      if (error) throw new Error(`Failed to update ${type} number: ${error.message}`);
    } else {
      const { error } = await supabase.from("contact_numbers").insert({
        user_id: user.id,
        type,
        phone_number: normalized,
        is_primary: isPrimary,
      });
      if (error) throw new Error(`Failed to save ${type} number: ${error.message}`);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!user) return;

    if (!whatsapp.trim()) return toast.error("WhatsApp number is required.");
    if (!primaryPhone.trim()) return toast.error("Primary phone number is required.");
    if (!validatePhone(whatsapp)) return toast.error("WhatsApp number is invalid.");
    if (!validatePhone(primaryPhone)) return toast.error("Primary phone number is invalid.");
    if (secondaryPhone && !validatePhone(secondaryPhone))
      return toast.error("Secondary phone number is invalid.");

    setSaving(true);
    try {
      const { data: existing, error: fetchErr } = await supabase
        .from("contact_numbers")
        .select("*")
        .eq("user_id", user.id);

      if (fetchErr) throw new Error(fetchErr.message);

      const find = (type, ip = false) =>
        existing?.find((c) => c.type === type && c.is_primary === ip);

      await upsertContact(find("whatsapp"), "whatsapp", false, whatsapp);
      await upsertContact(find("phone", true), "phone", true, primaryPhone);
      await upsertContact(find("phone", false), "phone", false, secondaryPhone);

      toast.success("Contact information saved successfully!");
      fetchContacts();

      // Clear the "came from create listing" flag so the user can go back
      sessionStorage.removeItem("cc.create.returnFromNumbers");
    } catch (err) {
      toast.error(err.message || "Failed to save contact information. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <SettingsHeader
        eyebrow="Contact"
        title="Contact Information"
        description="Manage how buyers reach you. WhatsApp and a primary phone number are required to publish listings."
      />

      <form onSubmit={handleSave} className="space-y-6">
        <SettingsSection
          title="WhatsApp"
          description="Buyers can message you instantly via WhatsApp."
          icon={MessageCircle}
        >
          <Field label="WhatsApp Number" required hint="Required — buyers will use this to chat with you.">
            <PhoneInput
              value={whatsapp}
              onChange={setWhatsapp}
              placeholder="024 123 4567"
              icon={MessageCircle}
            />
          </Field>
        </SettingsSection>

        <SettingsSection
          title="Phone Numbers"
          description="Voice and SMS contact numbers."
          icon={Phone}
        >
          <Field label="Primary Phone Number" required hint="Required — shown first on your listings.">
            <PhoneInput
              value={primaryPhone}
              onChange={setPrimaryPhone}
              placeholder="054 123 4567"
              icon={Phone}
            />
          </Field>
          <Field label="Secondary Phone Number" required={false} hint="A backup number for buyers to reach you.">
            <PhoneInput
              value={secondaryPhone}
              onChange={setSecondaryPhone}
              placeholder="020 123 4567"
              icon={PhoneCall}
            />
          </Field>
        </SettingsSection>

        <div>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-brand text-[hsl(var(--primary-fg))] text-sm font-semibold disabled:opacity-50 transition-transform active:scale-[0.98] hover:brightness-110"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
