import { useState } from "react";
import { AlertTriangle, Loader2, Trash2, ShieldAlert } from "lucide-react";
import { supabase } from "../../../lib/supabaseClient";
import { useAuth } from "../../../context/AuthContext";
import { SettingsHeader } from "../SettingsPrimitives";
import { useToast } from "../../../context/ToastContext";

export default function DeleteProfileTab() {
  const toast = useToast();
  const { logout } = useAuth();
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const canDelete = confirmText.trim().toUpperCase() === "DELETE";

  const handleDelete = async () => {
    if (!canDelete) return;
    setDeleting(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session found.");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-account`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        },
      );
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to delete account.");
      }
      toast.success("Your account has been deleted.");
      await logout();
    } catch (error) {
      console.error("Delete account error:", error);
      toast.error(error.message || "Failed to delete account.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-8">
      <SettingsHeader
        eyebrow="Danger zone"
        title="Delete account"
        description="Permanently remove your CampusConnect profile, listings, saved items and all associated data."
      />

      <section className="border border-[hsl(var(--danger)/0.4)] bg-[hsl(var(--danger)/0.05)] rounded-md overflow-hidden">
        <div className="px-5 py-4 border-b border-[hsl(var(--danger)/0.3)] flex items-center gap-2.5">
          <span className="w-7 h-7 grid place-items-center rounded-md bg-[hsl(var(--danger)/0.15)] text-[hsl(var(--danger))]">
            <ShieldAlert size={14} />
          </span>
          <p className="text-sm font-semibold text-[hsl(var(--danger))]">
            This action cannot be undone
          </p>
        </div>

        <div className="px-5 py-5 space-y-5">
          <ul className="text-xs text-muted space-y-1.5 leading-relaxed">
            <li className="flex items-start gap-2">
              <AlertTriangle
                size={12}
                className="mt-0.5 shrink-0 text-[hsl(var(--danger))]"
              />
              All your active listings will be permanently removed.
            </li>
            <li className="flex items-start gap-2">
              <AlertTriangle
                size={12}
                className="mt-0.5 shrink-0 text-[hsl(var(--danger))]"
              />
              Your profile, contact numbers, and saved items will be deleted.
            </li>
            <li className="flex items-start gap-2">
              <AlertTriangle
                size={12}
                className="mt-0.5 shrink-0 text-[hsl(var(--danger))]"
              />
              You will lose access immediately and cannot recover this account.
            </li>
          </ul>

          <div className="space-y-2">
            <label htmlFor="confirm" className="text-xs font-medium text-muted">
              Type{" "}
              <span className="font-bold text-[hsl(var(--danger))]">
                DELETE
              </span>{" "}
              to confirm
            </label>
            <input
              id="confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
              className="w-full bg-surface border border-app rounded-md py-2.5 px-3 text-sm text-main placeholder:text-faint focus:border-[hsl(var(--danger))] focus:ring-2 focus:ring-[hsl(var(--danger)/0.18)] outline-none transition-all"
            />
          </div>

          <button
            onClick={handleDelete}
            disabled={!canDelete || deleting}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-[hsl(var(--danger))] text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-transform active:scale-[0.98] hover:brightness-110"
          >
            {deleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            {deleting ? "Deleting…" : "Permanently delete account"}
          </button>
        </div>
      </section>
    </div>
  );
}
