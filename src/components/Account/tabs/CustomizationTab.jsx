import { Palette, Sun, Moon, Type, Maximize2, Check } from "lucide-react";
import { useTheme } from "../../../context/ThemeContext";
import { SettingsHeader, SettingsSection } from "../SettingsPrimitives";

export default function CustomizationTab() {
  const {
    theme, setTheme, themes,
    mode, setMode,
    font, setFont, fonts,
    scale, setScale, scales,
  } = useTheme();

  return (
    <div className="space-y-8" >
      <SettingsHeader
        eyebrow="Look & feel"
        title="Customization"
        description="Personalize your CampusConnect experience. All changes save automatically."
      />

      <SettingsSection
        title="Theme"
        description="Choose a full app palette for backgrounds, cards, borders, accents and prices."
        icon={Palette}
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {themes.map((t) => {
            const active = t.id === theme;
            return (
              <button key={t.id} type="button" onClick={() => setTheme(t.id)} className={`relative p-3 rounded-md border text-left transition-colors ${ active ? "border-[hsl(var(--primary))] bg-brand-soft" : "border-app bg-app hover:border-[hsl(var(--text-faint))]" }`} >
                <div
                  className="w-full h-12 rounded-sm mb-2"
                  style={{
                    background: `linear-gradient(135deg, hsl(${t.swatch}), hsl(${t.secondary}))`,
                  }}
                />
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-main truncate">{t.name}</p>
                  {active && <Check size={14} className="text-brand shrink-0" />}
                </div>
              </button>
            );
          })}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Appearance"
        description="Switch between a bright light interface and a calmer dark one."
        icon={mode === "dark" ? Moon : Sun}
      >
        <div className="grid grid-cols-2 gap-3">
          {[
            { id: "light", label: "Light", icon: Sun },
            { id: "dark", label: "Dark", icon: Moon },
          ].map(({ id, label, icon: Icon }) => {
            const active = mode === id;
            return (
              <button key={id} type="button" onClick={() => setMode(id)} className={`flex items-center gap-3 p-4 rounded-md border transition-colors ${ active ? "border-[hsl(var(--primary))] bg-brand-soft" : "border-app bg-app hover:border-[hsl(var(--text-faint))]" }`} >
                <span className={`w-9 h-9 grid place-items-center rounded-md ${
                  active ? "bg-brand text-[hsl(var(--primary-fg))]" : "bg-surface-2 text-muted"
                }`}>
                  <Icon size={16} />
                </span>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-main">{label}</p>
                  <p className="text-[11px] text-faint">
                    {id === "light" ? "Bright & clean" : "Easy on the eyes"}
                  </p>
                </div>
                {active && <Check size={14} className="text-brand" />}
              </button>
            );
          })}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Typography"
        description="Pick a type direction. Quaker is applied to headings while body text stays highly readable."
        icon={Type}
      >
        <div className="space-y-2">
          {fonts.map((f) => {
            const active = f.id === font;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFont(f.id)}
                className={`w-full flex items-center justify-between gap-3 p-3 rounded-md border transition-colors ${
                  active
                    ? "border-[hsl(var(--primary))] bg-brand-soft"
                    : "border-app bg-app hover:border-[hsl(var(--text-faint))]"
                }`}
              >
                <div className="text-left">
                  <p className="text-sm font-medium text-main" style={{ fontFamily: f.stack }}>
                    {f.name}
                  </p>
                  <p className="text-[11px] text-faint" style={{ fontFamily: f.stack }}>
                    The quick brown fox jumps over the lazy dog
                  </p>
                </div>
                {active && <Check size={14} className="text-brand shrink-0" />}
              </button>
            );
          })}
        </div>
      </SettingsSection>

      <SettingsSection
        title="UI scale"
        description="Adjust text, spacing and controls across the marketplace."
        icon={Maximize2}
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {scales.map((s) => {
            const active = s.id === scale;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setScale(s.id)}
                className={`p-3 rounded-md border text-center transition-colors ${
                  active
                    ? "border-[hsl(var(--primary))] bg-brand-soft"
                    : "border-app bg-app hover:border-[hsl(var(--text-faint))]"
                }`}
              >
                <p className="text-xs font-medium text-main">{s.name}</p>
                <p className="text-[10px] text-faint mt-0.5">{Math.round(s.value * 100)}%</p>
              </button>
            );
          })}
        </div>
      </SettingsSection>
    </div>
  );
}
