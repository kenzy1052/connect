import React from "react";
import { Link } from "react-router-dom";
import Logo from "../Layout/Logo";

// Default to the video in your public folder
const DEFAULT_VIDEO = "/auth.mp4";

export default function AuthLayout({
  children,
  title,
  subtitle,
  video = DEFAULT_VIDEO,
  imagePosition = "left", // "left" | "right"
}) {
  const imageOnRight = imagePosition === "right";

  const VideoPanel = (
    <div className="relative hidden lg:block lg:w-1/2 overflow-hidden">
      {/* ── The Video Engine ── */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
      >
        <source src={video} type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* Subtle brand-tinted gradient overlay for legibility */}
      <div
        className="absolute inset-0 z-[1]"
        style={{
          background:
            "linear-gradient(135deg, hsl(var(--primary) / 0.45) 0%, transparent 45%, hsl(var(--background) / 0.55) 100%)",
        }}
      />

      {/* Brand mark top-left - Updated to match your branding snippet */}
      <div className="absolute left-10 top-10 z-10">
        <Link to="/" className="flex items-center gap-2 shrink-0 group">
          <div className="w-8 h-8 rounded-md gradient-brand grid place-items-center shadow-[0_4px_14px_hsl(var(--primary)/0.4)]">
            <Logo className="w-5 h-5 text-[hsl(var(--primary-fg))]" />
          </div>
          <span className="text-base font-bold tracking-tight text-white drop-shadow-sm">
            CampusConnect
          </span>
        </Link>
      </div>

      {/* Note: Editorial caption and bottom-darken overlay removed to keep the video clean */}
    </div>
  );

  const FormPanel = (
    <div className="relative flex w-full flex-col items-center justify-center px-6 py-12 lg:w-1/2 lg:px-12">
      {/* Solid panel background — ensures no grid/distractions bleed through */}
      <div
        className="absolute inset-0"
        style={{ background: "hsl(var(--surface))" }}
      />

      <div className="relative z-10 w-full max-w-[400px]">
        {(title || subtitle) && (
          <div className="mb-8 text-center lg:text-left">
            {title && (
              <h2 className="text-3xl font-black leading-tight text-main tracking-tight">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="mt-2 text-sm text-muted font-medium">{subtitle}</p>
            )}
          </div>
        )}

        {children}

        <div className="mt-8 flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-widest text-faint">
          <span className="h-1.5 w-1.5 rounded-full bg-brand shadow-[0_0_10px_hsl(var(--primary)/0.8)]" />
          UCC Exclusive Gateway
        </div>
      </div>
    </div>
  );

  return (
    <div
      className="relative flex min-h-screen w-full overflow-hidden"
      style={{ background: "hsl(var(--background))" }}
    >
      {imageOnRight ? (
        <>
          {FormPanel}
          {VideoPanel}
        </>
      ) : (
        <>
          {VideoPanel}
          {FormPanel}
        </>
      )}
    </div>
  );
}
