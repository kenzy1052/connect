// src/components/Auth/AuthLayout.jsx
import React from "react";

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

      {/* Bottom darken for caption legibility */}
      <div
        className="absolute inset-x-0 bottom-0 h-1/2 z-[2]"
        style={{
          background:
            "linear-gradient(to top, hsl(var(--background) / 0.8), transparent)",
        }}
      />

      {/* Brand mark top-left */}
      <div className="absolute left-10 top-10 z-10 flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-md gradient-brand shadow-[0_18px_42px_hsl(var(--primary)/0.4)]">
          <span className="text-base font-black text-[hsl(var(--primary-fg))]">
            C
          </span>
        </div>
        <span className="text-lg font-black tracking-tight text-white drop-shadow">
          CampusConnect
        </span>
      </div>

      {/* Editorial caption bottom-left */}
      <div className="absolute bottom-10 left-10 right-10 z-10 max-w-md">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
          UCC Student Marketplace
        </p>
        <h2 className="mt-3 text-3xl font-black leading-tight text-white drop-shadow">
          Where campus life meets a smarter way to buy & sell.
        </h2>
        <p className="mt-3 text-sm text-white/80">
          Built exclusively for the University of Cape Coast community.
        </p>
      </div>
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
