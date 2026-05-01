import { useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { useAuth } from "../../../context/AuthContext";
import toast from "react-hot-toast";
import { Loader2, CheckCircle2, KeyRound, ShieldCheck, Lock, Eye, EyeOff } from "lucide-react";
import { SettingsHeader, SettingsSection } from "../SettingsPrimitives";

export default function SecurityTab() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const strength = (() => {
    if (!password) return 0;
    let s = 0;
    if (password.length >= 6) s++;
    if (password.length >= 10) s++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) s++;
    if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) s++;
    return s;
  })();

  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][strength];
  const strengthColor = ["", "bg-[hsl(var(--danger))]", "bg-amber-500", "bg-amber-400", "bg-[hsl(var(--primary))]"][strength];

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setSuccess(false);

    if (!currentPassword) return toast.error("Please enter your current password.");
    if (!password) return toast.error("Please enter a new password.");
    if (password.length < 6) return toast.error("New password must be at least 6 characters.");
    if (password !== confirmPassword) return toast.error("New passwords do not match.");
    if (currentPassword === password) return toast.error("New password must be different from current password.");

    setSubmitting(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (signInError) {
        toast.error("Current password is incorrect.");
        setSubmitting(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      setSuccess(true);
      toast.success("Password updated successfully.");
      setCurrentPassword("");
      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast.error(error.message || "Failed to update password.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <SettingsHeader
        eyebrow="Account"
        title="Password Update"
        description="Keep your account secure. Enter your current password to set a new one."
      />

      {success && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-[hsl(var(--primary)/0.08)] border border-[hsl(var(--primary)/0.25)] text-[hsl(var(--primary))] text-sm font-medium">
          <CheckCircle2 size={16} />
          Your password has been updated successfully.
        </div>
      )}

      <SettingsSection
        title="Update password"
        description="Enter your current password, then choose a new strong password."
        icon={KeyRound}
      >
        <form onSubmit={handlePasswordChange} className="space-y-5">
          <PasswordInput
            id="current-password"
            label="Current password"
            value={currentPassword}
            onChange={setCurrentPassword}
            placeholder="Enter your current password"
            icon={Lock}
          />

          <div className="border-t border-app pt-5 space-y-5">
            <PasswordInput
              id="new-password"
              label="New password"
              value={password}
              onChange={setPassword}
              placeholder="At least 6 characters"
              icon={KeyRound}
            />

            {password && (
              <div className="space-y-1.5">
                <div className="h-1.5 w-full bg-[hsl(var(--border))] rounded-full overflow-hidden flex gap-0.5">
                  {[1, 2, 3, 4].map((level) => (
                    <div
                      key={level}
                      className={`flex-1 rounded-full transition-all duration-300 ${
                        strength >= level ? strengthColor : "bg-transparent"
                      }`}
                    />
                  ))}
                </div>
                <p className="text-[11px] text-faint">
                  Password strength:{" "}
                  <span className="text-main font-medium">{strengthLabel || "Too short"}</span>
                </p>
              </div>
            )}

            <PasswordInput
              id="confirm-password"
              label="Confirm new password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="Re-enter new password"
              icon={ShieldCheck}
            />

            {confirmPassword && password !== confirmPassword && (
              <p className="text-xs text-[hsl(var(--danger))]">Passwords do not match.</p>
            )}
            {confirmPassword && password === confirmPassword && confirmPassword.length > 0 && (
              <p className="text-xs text-[hsl(var(--primary))]">Passwords match.</p>
            )}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting || !currentPassword || !password || !confirmPassword}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-brand text-[hsl(var(--primary-fg))] text-sm font-semibold disabled:opacity-50 transition-transform active:scale-[0.98] hover:brightness-110"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {submitting ? "Updating…" : "Update password"}
            </button>
          </div>
        </form>
      </SettingsSection>
    </div>
  );
}

function PasswordInput({ id, label, value, onChange, placeholder, icon: Icon }) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-medium text-muted">
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" size={14} />
        )}
        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-app border border-app rounded-md py-2.5 pl-9 pr-10 text-sm text-main placeholder:text-faint focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary)/0.18)] outline-none transition-all"
          required
        />
        <button
          type="button"
          onClick={() => setShow((p) => !p)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-faint hover:text-main transition-colors"
          tabIndex={-1}
        >
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
    </div>
  );
}
