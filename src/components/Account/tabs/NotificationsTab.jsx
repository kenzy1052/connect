import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { useAuth } from "../../../context/AuthContext";
import { Mail, Send, Loader2, Megaphone, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import { SettingsHeader, SettingsSection, ToggleRow } from "../SettingsPrimitives";

const DEFAULTS = {
  email_messages: true,
  email_offers: true,
  email_marketing: false,
  push_messages: true,
};

export default function NotificationsTab() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchPreferences();
    // eslint-disable-next-line
  }, [user]);

  async function fetchPreferences() {
    setLoading(true);
    const { data, error } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching notification preferences:", error);
      toast.error("Failed to load preferences.");
    } else if (data) {
      setPreferences({ ...DEFAULTS, ...data });
    }
    setLoading(false);
  }

  async function updatePreference(key, value) {
    if (!user) return;
    setSaving(true);
    const next = { ...preferences, [key]: value };
    setPreferences(next); // optimistic

    const { error } = await supabase
      .from("notification_preferences")
      .upsert({ user_id: user.id, ...next }, { onConflict: "user_id" });

    if (error) {
      console.error("Error updating notification preference:", error);
      toast.error("Failed to save.");
      setPreferences(preferences); // rollback
    } else {
      toast.success("Preferences saved");
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 text-brand animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <SettingsHeader
        eyebrow="Notifications"
        title="Notification settings"
        description="Choose how you want to hear from CampusConnect. We never sell your data."
      />

      <div className="space-y-5">
        <SettingsSection
          title="Email"
          description="Sent to the address on your account."
          icon={Mail}
        >
          <ToggleRow
            label="Direct messages"
            description="When another user messages you about a listing."
            checked={preferences.email_messages}
            onChange={(e) => updatePreference("email_messages", e.target.checked)}
            disabled={saving}
          />
          <ToggleRow
            label="Promotions"
            description="Discounts, deals, and special offers from sellers you follow."
            checked={preferences.email_offers}
            onChange={(e) => updatePreference("email_offers", e.target.checked)}
            disabled={saving}
          />
          <ToggleRow
            label="Updates"
            description="Product news, marketplace updates, and feature announcements."
            checked={preferences.email_marketing}
            onChange={(e) => updatePreference("email_marketing", e.target.checked)}
            disabled={saving}
          />
        </SettingsSection>

        <SettingsSection
          title="Push"
          description="Real-time alerts on this device."
          icon={Send}
        >
          <ToggleRow
            label="Direct messages"
            description="Push notifications for new messages. Requires browser permission."
            checked={preferences.push_messages}
            onChange={(e) => updatePreference("push_messages", e.target.checked)}
            disabled={saving}
          />
          <p className="text-xs text-faint pt-1">
            Tip: enable browser notifications in your browser settings to receive these.
          </p>
        </SettingsSection>

        <div className="flex items-start gap-3 p-4 rounded-md border border-app bg-surface-2/50">
          <Sparkles size={16} className="text-brand mt-0.5 shrink-0" />
          <div className="text-xs text-muted">
            <p className="text-main font-medium">Recent notifications</p>
            <p className="mt-0.5">
              Tap the bell <Megaphone size={11} className="inline -mt-0.5" /> in the top bar to see
              your latest activity — FAQ replies, saved listings, reports and admin alerts.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
