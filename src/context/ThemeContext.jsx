import { createContext, useContext, useEffect, useMemo, useState } from "react";

const ThemeContext = createContext(null);

export const THEMES = [
  {
    id: "neon-green",
    name: "Neon Green",
    swatch: "157 100% 50%",
    secondary: "194 100% 50%",
  },
  {
    id: "mtn-yellow",
    name: "MTN Yellow",
    swatch: "50 100% 50%",
    secondary: "36 100% 52%",
  },
  {
    id: "crimson-red",
    name: "Crimson Red",
    swatch: "350 100% 62%",
    secondary: "359 81% 47%",
  },
  {
    id: "royal-blue",
    name: "Royal Blue",
    swatch: "217 91% 60%",
    secondary: "242 66% 54%",
  },
  {
    id: "purple-galaxy",
    name: "Purple Galaxy",
    swatch: "258 90% 66%",
    secondary: "247 66% 58%",
  },
  {
    id: "aqua-cyan",
    name: "Aqua Cyan",
    swatch: "186 100% 50%",
    secondary: "158 100% 50%",
  },
  {
    id: "orange-ember",
    name: "Orange Ember",
    swatch: "26 100% 55%",
    secondary: "26 92% 50%",
  },
  {
    id: "pink-rose",
    name: "Pink Rose",
    swatch: "333 100% 65%",
    secondary: "332 82% 58%",
  },
];

export const FONTS = [
  {
    id: "inter",
    name: "Inter",
    stack: "'Inter', ui-sans-serif, system-ui, sans-serif",
  },
  {
    id: "space-grotesk",
    name: "Space Grotesk",
    stack: "'Space Grotesk', 'Inter', ui-sans-serif, system-ui, sans-serif",
  },
  {
    id: "poppins",
    name: "Poppins",
    stack: "'Poppins', 'Inter', ui-sans-serif, system-ui, sans-serif",
  },
  {
    id: "playfair",
    name: "Playfair Display",
    stack: "'Playfair Display', Georgia, serif",
  },
  {
    id: "sora",
    name: "Sora",
    stack: "'Sora', 'Inter', ui-sans-serif, system-ui, sans-serif",
  },
  {
    id: "quaker",
    name: "Quaker",
    stack: "'Inter', ui-sans-serif, system-ui, sans-serif",
    headingStack: "'Quaker', 'Playfair Display', Georgia, serif",
  },
];

export const SCALES = [
  { id: "xs", name: "Extra Small", value: 0.9 },
  { id: "small", name: "Small", value: 0.96 },
  { id: "normal", name: "Normal", value: 1.0 },
  { id: "large", name: "Large", value: 1.1 },
];

const STORAGE_KEY = "cc.theme.v1";

function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function validOrDefault(value, list, fallback) {
  return list.some((item) => item.id === value) ? value : fallback;
}

const REDUCED_MOTION =
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

export function ThemeProvider({ children }) {
  const stored = readStored() || {};
  const initial = {
    theme: validOrDefault(stored.theme, THEMES, "royal-blue"),
    mode:
      stored.mode === "light" || stored.mode === "dark" ? stored.mode : "dark",
    font: validOrDefault(stored.font, FONTS, "inter"),
    scale: validOrDefault(stored.scale, SCALES, "normal"),
  };
  const [theme, setTheme] = useState(initial.theme);
  const [mode, setMode] = useState(initial.mode);
  const [font, setFont] = useState(initial.font);
  const [scale, setScale] = useState(initial.scale);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    root.setAttribute("data-mode", mode);
    root.setAttribute("data-font", font);
    root.setAttribute("data-scale", scale);
    if (REDUCED_MOTION) root.setAttribute("data-reduced-motion", "true");

    const scaleValue = SCALES.find((s) => s.id === scale)?.value ?? 1;
    root.style.fontSize = `${16 * scaleValue}px`;
    root.style.setProperty("--ui-scale", scaleValue);

    const selectedFont = FONTS.find((f) => f.id === font);
    if (selectedFont?.stack)
      root.style.setProperty("--font-sans", selectedFont.stack);
    root.style.setProperty(
      "--font-heading",
      selectedFont?.headingStack || selectedFont?.stack || FONTS[0].stack,
    );

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ theme, mode, font, scale }),
      );
    } catch {
      /* ignore */
    }
  }, [theme, mode, font, scale]);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      mode,
      setMode,
      toggleMode: () => setMode((m) => (m === "dark" ? "light" : "dark")),
      font,
      setFont,
      scale,
      setScale,
      themes: THEMES,
      fonts: FONTS,
      scales: SCALES,
      reducedMotion: REDUCED_MOTION,
    }),
    [theme, mode, font, scale],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
