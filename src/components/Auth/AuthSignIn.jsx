// src/components/Auth/AuthSignIn.jsx
import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import AuthLayout from "./AuthLayout";
import {
  Field,
  Input,
  PasswordInput,
  PrimaryButton,
  ErrorBanner,
  validateUCCEmail,
} from "./AuthUI";

// ── Google "G" icon (official colour mark) ────────────────────────────────────
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

// ── Divider ────────────────────────────────────────────────────────────────────
function OrDivider() {
  return (
    <div className="flex items-center gap-3 my-1">
      <div
        className="flex-1 h-px"
        style={{ background: "hsl(var(--border))" }}
      />
      <span
        className="text-[10px] font-black uppercase tracking-widest"
        style={{ color: "hsl(var(--text-faint))" }}
      >
        or
      </span>
      <div
        className="flex-1 h-px"
        style={{ background: "hsl(var(--border))" }}
      />
    </div>
  );
}

export default function AuthSignIn() {
  const navigate = useNavigate();
  const location = useLocation();

  // If we were redirected from a protected route, go back there after login
  const from = location.state?.from?.pathname || "/";

  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");
  const [loading, setLoading]           = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError]               = useState("");
  const [fieldErrors, setFieldErrors]   = useState({});

  // ── Google OAuth ──────────────────────────────────────────────────────────
  const handleGoogleSignIn = async () => {
    setError("");
    setGoogleLoading(true);
    try {
      const { error: oauthErr } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          // After Google redirects back, Supabase resolves the session automatically.
          // redirectTo must match the Redirect URL you added in Supabase → Auth → URL Config.
          redirectTo: `${window.location.origin}/`,
          queryParams: {
            // Request profile scope so we can access the user's full name
            access_type: "online",
            prompt: "select_account",
          },
        },
      });
      if (oauthErr) throw oauthErr;
      // Browser will be redirected to Google — no further code runs here.
    } catch (err) {
      setError(err.message || "Google sign-in failed. Please try again.");
      setGoogleLoading(false);
    }
  };

  // ── UCC email + password inline validation ────────────────────────────────
  const validate = () => {
    const errs = {};
    const emailErr = validateUCCEmail(email);
    if (emailErr) errs.email = emailErr;
    if (!password) errs.password = "Password is required.";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Email/password submit ─────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!validate()) return;

    setLoading(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (authError) {
        if (authError.message.toLowerCase().includes("email not confirmed")) {
          throw new Error(
            "Your email hasn't been verified yet. Check your inbox for the confirmation link."
          );
        }
        if (
          authError.message.toLowerCase().includes("invalid login") ||
          authError.message.toLowerCase().includes("invalid credentials")
        ) {
          throw new Error(
            "Incorrect email or password. Please check your details and try again."
          );
        }
        throw authError;
      }

      // Success — AuthContext's onAuthStateChange fires and updates user
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to your account">
      <div className="space-y-5">
        {/* ── Global error ─── */}
        <ErrorBanner message={error} />

        {/* ── Google OAuth button ─── */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
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
          <span>{googleLoading ? "Redirecting to Google…" : "Continue with Google"}</span>
        </button>

        <OrDivider />

        {/* ── Email / Password form ─── */}
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {/* ── Email ─── */}
          <Field label="UCC Email address" error={fieldErrors.email}>
            <Input
              type="email"
              placeholder="you@stu.ucc.edu.gh"
              value={email}
              autoComplete="email"
              autoFocus
              disabled={loading}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email)
                  setFieldErrors((p) => ({ ...p, email: "" }));
              }}
            />
          </Field>

          {/* ── Password ─── */}
          <Field label="Password" error={fieldErrors.password}>
            <PasswordInput
              placeholder="Your password"
              value={password}
              autoComplete="current-password"
              disabled={loading}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password)
                  setFieldErrors((p) => ({ ...p, password: "" }));
              }}
            />
          </Field>

          {/* ── Forgot password link ─── */}
          <div className="flex justify-end -mt-1">
            <Link
              to="/forgot-password"
              className="text-[12px] font-semibold transition-colors"
              style={{ color: "hsl(var(--primary))" }}
            >
              Forgot your password?
            </Link>
          </div>

          {/* ── Submit ─── */}
          <PrimaryButton loading={loading} type="submit">
            Sign In with Email
          </PrimaryButton>
        </form>

        {/* ── Switch to sign up ─── */}
        <p
          className="text-center text-sm pt-1"
          style={{ color: "hsl(var(--text-muted))" }}
        >
          Don&apos;t have an account?{" "}
          <Link
            to="/signup"
            className="font-bold transition-colors"
            style={{ color: "hsl(var(--primary))" }}
          >
            Create account
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
