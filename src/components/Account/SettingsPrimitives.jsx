/**
 * Settings primitives — shared across all settings tabs for consistency.
 * No floating cards. Structured sections with subtle borders.
 */

export function SettingsHeader({ eyebrow, title, description, actions }) {
  return (
    <header className="mb-8 flex items-start justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="text-[10px] font-semibold uppercase tracking-widest text-faint">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-1 text-2xl md:text-3xl font-bold text-main tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="mt-2 text-sm text-muted max-w-xl">{description}</p>
        )}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </header>
  );
}

export function SettingsSection({ title, description, children, icon: Icon }) {
  return (
    <section className="border border-app rounded-md bg-surface overflow-hidden">
      <div className="px-5 py-4 border-b border-app flex items-center gap-2.5">
        {Icon && (
          <span className="w-7 h-7 grid place-items-center rounded-md bg-brand-soft text-brand">
            <Icon size={14} />
          </span>
        )}
        <div className="min-w-0">
          <p className="text-sm font-semibold text-main">{title}</p>
          {description && <p className="text-xs text-muted mt-0.5">{description}</p>}
        </div>
      </div>
      <div className="px-5 py-5 space-y-5">{children}</div>
    </section>
  );
}

export function ToggleRow({ label, description, checked, onChange, disabled }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-main">{label}</p>
        {description && (
          <p className="text-xs text-muted mt-0.5 leading-relaxed">{description}</p>
        )}
      </div>
      <Toggle checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  );
}

export function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange?.({ target: { checked: !checked } })}
      className={`relative shrink-0 w-10 h-6 rounded-full transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))] ${
        checked ? "bg-[hsl(var(--primary))]" : "bg-[hsl(var(--border))]"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span
        className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200"
        style={{ transform: `translateX(${checked ? 16 : 0}px)` }}
      />
    </button>
  );
}
