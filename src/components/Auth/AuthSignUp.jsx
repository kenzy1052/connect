// src/components/Auth/AuthSignUp.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import AuthLayout from "./AuthLayout";
import {
  Field,
  Input,
  PasswordInput,
  PrimaryButton,
  ErrorBanner,
  SuccessBanner,
  validateUCCEmail,
} from "./AuthUI";

// ── Google "G" icon (official colour mark) ────────────────────────────────────
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

// ── Divider ────────────────────────────────────────────────────────────────────
function OrDivider() {
  return (
    <div className="flex items-center gap-3 my-1">
      <div className="flex-1 h-px" style={{ background: "hsl(var(--border))" }} />
      <span
        className="text-[10px] font-black uppercase tracking-widest"
        style={{ color: "hsl(var(--text-faint))" }}
      >
        or sign up with UCC email
      </span>
      <div className="flex-1 h-px" style={{ background: "hsl(var(--border))" }} />
    </div>
  );
}

// ── Password strength meter ────────────────────────────────────────────────────
function PasswordStrength({ password }) {
  if (!password) return null;

  const checks = [
    { label: "At least 8 characters", pass: password.length >= 8 },
    { label: "Contains a number", pass: /\d/.test(password) },
    { label: "Contains a letter", pass: /[a-zA-Z]/.test(password) },
    { label: "Contains a symbol", pass: /[^a-zA-Z0-9]/.test(password) },
  ];

  const score = checks.filter((c) => c.pass).length;
  const levels = [
    { color: "bg-red-500",    bar: "w-1/4" },
    { color: "bg-orange-500", bar: "w-2/4" },
    { color: "bg-yellow-500", bar: "w-3/4" },
    { color: "bg-emerald-500", bar: "w-full" },
  ];
  const level = levels[Math.min(score - 1, 3)] || levels[0];

  return (
    <div className="space-y-2 mt-2">
      <div className="h-1 rounded-full overflow-hidden" style={{ background: "hsl(var(--surface-2))" }}>
        <div className={`h-full rounded-full transition-all duration-300 ${level.color} ${level.bar}`} />
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {checks.map((c) => (
          <div key={c.label} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded-full flex items-center justify-center shrink-0 ${c.pass ? "bg-emerald-500" : "bg-slate-700"}`}>
              {c.pass && (
                <svg className="w-2 h-2 text-white" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <span className={`text-[10px] ${c.pass ? "text-emerald-400" : "text-slate-600"}`}>
              {c.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AuthSignUp() {
  const navigate = useNavigate();

  const [fullName, setFullName]         = useState("");
  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");
  const [confirm, setConfirm]           = useState("");
  const [loading, setLoading]           = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError]               = useState("");
  const [success, setSuccess]           = useState("");
  const [fieldErrors, setFieldErrors]   = useState({});

  // ── Google OAuth ──────────────────────────────────────────────────────────
  const handleGoogleSignUp = async () => {
    setError("");
    setGoogleLoading(true);
    try {
      const { error: oauthErr } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/`,
          queryParams: {
            access_type: "online",
            prompt: "select_account",
          },
        },
      });
      if (oauthErr) throw oauthErr;
      // Browser redirects to Google — no further code runs here.
    } catch (err) {
      setError(err.message || "Google sign-up failed. Please try again.");
      setGoogleLoading(false);
    }
  };

  // ── UCC email validation ──────────────────────────────────────────────────
  const validate = () => {
    const errs = {};
    if (!fullName.trim()) errs.fullName = "Full name is required.";
    const emailErr = validateUCCEmail(email);
    if (emailErr) errs.email = emailErr;
    if (!password) errs.password = "Password is required.";
    else if (password.length < 8)
      errs.password = "Password must be at least 8 characters.";
    if (!confirm) errs.confirm = "Please confirm your password.";
    else if (password !== confirm) errs.confirm = "Passwords do not match.";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!validate()) return;

    setLoading(true);
    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: { full_name: fullName.trim() },
        },
      });

      if (authError) {
        if (authError.message.toLowerCase().includes("already registered")) {
          throw new Error(
            "An account with this email already exists. Try signing in instead."
          );
        }
        throw authError;
      }

      // Supabase silently "succeeds" for duplicate emails with confirmation ON
      if (data?.user && (data.user.identities?.length ?? 0) === 0) {
        throw new Error(
          "An account with this email already exists. Please sign in instead."
        );
      }

      if (data?.session) {
        navigate("/", { replace: true });
      } else {
        setSuccess(
          "Account created! We've sent a confirmation link to your email. Please verify your address before signing in."
        );
        setPassword("");
        setConfirm("");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create account"
      subtitle="Join the UCC student marketplace"
      imagePosition="right"
      video="/auth.mp4"
    >
      <div className="space-y-5">
        {/* ── Global error / success ─── */}
        <ErrorBanner message={error} />
        <SuccessBanner message={success} />

        {success ? (
          <div className="space-y-4 pt-2">
            <p className="text-center text-sm" style={{ color: "hsl(var(--text-muted))" }}>
              Already verified?{" "}
              <Link to="/signin" className="font-bold" style={{ color: "hsl(var(--primary))" }}>
                Sign in
              </Link>
            </p>
          </div>
        ) : (
          <>
            {/* ── Google OAuth button ─── */}
            <button
              type="button"
              onClick={handleGoogleSignUp}
              disabled={googleLoading || loading}
              className="w-full flex items-center justify-center gap-3 py-3.5 px-5 rounded-xl font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-60"
              style={{
                background: "hsl(var(--surface-2))",
                border: "1px solid hsl(var(--border))",
                color: "hsl(var(--text))",
                boxShadow: "0 1px 4px hsl(0 0% 0% / 0.08)",
              }}
            >
              {googleLoading ? (
                <div
                  className="w-4 h-4 rounded-full border-2 animate-spin shrink-0"
                  style={{
                    borderColor: "hsl(var(--text-faint) / 0.3)",
                    borderTopColor: "hsl(var(--text))",
                  }}
                />
              ) : (
                <GoogleIcon />
              )}
              <span>
                {googleLoading ? "Redirecting to Google…" : "Continue with Google"}
              </span>
            </button>

            {/* Note about Google sign-up */}
            <p className="text-center text-[11px]" style={{ color: "hsl(var(--text-faint))" }}>
              Google sign-in works with any Gmail account. Your full name is fetched automatically.
            </p>

            <OrDivider />

            {/* ── Email + Password form ─── */}
            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              {/* ── Full name ─── */}
              <Field label="Full name" error={fieldErrors.fullName}>
                <Input
                  type="text"
                  placeholder="e.g. Kwame Mensah"
                  value={fullName}
                  autoComplete="name"
                  autoFocus
                  disabled={loading}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (fieldErrors.fullName)
                      setFieldErrors((p) => ({ ...p, fullName: "" }));
                  }}
                />
              </Field>

              {/* ── Email ─── */}
              <Field label="UCC Email address" error={fieldErrors.email}>
                <Input
                  type="email"
                  placeholder="you@stu.ucc.edu.gh"
                  value={email}
                  autoComplete="email"
                  disabled={loading}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email)
                      setFieldErrors((p) => ({ ...p, email: "" }));
                  }}
                />
                <p className="text-[10px] mt-1" style={{ color: "hsl(var(--text-faint))" }}>
                  Only @ucc.edu.gh or @stu.ucc.edu.gh addresses
                </p>
              </Field>

              {/* ── Password ─── */}
              <Field label="Password" error={fieldErrors.password}>
                <PasswordInput
                  placeholder="Create a strong password"
                  value={password}
                  autoComplete="new-password"
                  disabled={loading}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password)
                      setFieldErrors((p) => ({ ...p, password: "" }));
                  }}
                />
                <PasswordStrength password={password} />
              </Field>

              {/* ── Confirm password ─── */}
              <Field label="Confirm password" error={fieldErrors.confirm}>
                <PasswordInput
                  placeholder="Repeat your password"
                  value={confirm}
                  autoComplete="new-password"
                  disabled={loading}
                  onChange={(e) => {
                    setConfirm(e.target.value);
                    if (fieldErrors.confirm)
                      setFieldErrors((p) => ({ ...p, confirm: "" }));
                  }}
                />
              </Field>

              {/* ── Submit ─── */}
              <PrimaryButton loading={loading} type="submit">
                Create Account
              </PrimaryButton>

              {/* ── Switch to sign in ─── */}
              <p className="text-center text-sm pt-1" style={{ color: "hsl(var(--text-muted))" }}>
                Already have an account?{" "}
                <Link
                  to="/signin"
                  className="font-bold transition-colors"
                  style={{ color: "hsl(var(--primary))" }}
                >
                  Sign in
                </Link>
              </p>
            </form>
          </>
        )}
      </div>
    </AuthLayout>
  );
}
