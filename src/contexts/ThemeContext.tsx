import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type BackgroundMode = "solid" | "gradient" | "image";

export type PanelBackground = {
  mode: BackgroundMode;
  value: string;
  overlay: number;
  blur: number;
  position: string;
};

export type VisualThemeConfig = {
  colors: {
    primary: string;
    secondary: string;
    border: string;
    background: string;
    card: string;
    foreground: string;
    success: string;
    warning: string;
    destructive: string;
    info: string;
  };
  logos: {
    full: string;
    mark: string;
  };
  backgrounds: Record<string, PanelBackground>;
};

const defaultBackground: PanelBackground = {
  mode: "solid",
  value: "#0f172a",
  overlay: 0,
  blur: 0,
  position: "center",
};

export const DEFAULT_VISUAL_THEME: VisualThemeConfig = {
  colors: {
    primary: "#3b82f6",
    secondary: "#1e293b",
    border: "#334155",
    background: "#0f172a",
    card: "#162033",
    foreground: "#f8fafc",
    success: "#10b981",
    warning: "#f59e0b",
    destructive: "#ef4444",
    info: "#0ea5e9",
  },
  logos: {
    full: "",
    mark: "",
  },
  backgrounds: {
    default: defaultBackground,
    login: { ...defaultBackground, value: "#0b1120" },
    home: { ...defaultBackground },
    checkin: { ...defaultBackground },
    manual: { ...defaultBackground },
    temporary: { ...defaultBackground },
    dashboard: { ...defaultBackground },
    personnel: { ...defaultBackground },
    visits: { ...defaultBackground },
  },
};

const STORAGE_KEY = "am-control-visual-theme-v1";

function hexToHslTriplet(hex: string) {
  const clean = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return "0 0% 50%";
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  const d = max - min;

  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r:
        h = 60 * (((g - b) / d) % 6);
        break;
      case g:
        h = 60 * ((b - r) / d + 2);
        break;
      default:
        h = 60 * ((r - g) / d + 4);
        break;
    }
  }

  if (h < 0) h += 360;
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function loadTheme(): VisualThemeConfig {
  if (typeof window === "undefined") return DEFAULT_VISUAL_THEME;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_VISUAL_THEME;
    const parsed = JSON.parse(raw) as Partial<VisualThemeConfig>;
    return {
      colors: { ...DEFAULT_VISUAL_THEME.colors, ...(parsed.colors || {}) },
      logos: { ...DEFAULT_VISUAL_THEME.logos, ...(parsed.logos || {}) },
      backgrounds: {
        ...DEFAULT_VISUAL_THEME.backgrounds,
        ...(parsed.backgrounds || {}),
      },
    };
  } catch {
    return DEFAULT_VISUAL_THEME;
  }
}

type ThemeContextValue = {
  config: VisualThemeConfig;
  setConfig: React.Dispatch<React.SetStateAction<VisualThemeConfig>>;
  save: () => void;
  reset: () => void;
  backgroundForPath: (pathname: string) => PanelBackground;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function VisualThemeProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<VisualThemeConfig>(() => loadTheme());

  useEffect(() => {
    const root = document.documentElement;
    const c = config.colors;
    root.style.setProperty("--primary", hexToHslTriplet(c.primary));
    root.style.setProperty("--secondary", hexToHslTriplet(c.secondary));
    root.style.setProperty("--border", hexToHslTriplet(c.border));
    root.style.setProperty("--input", hexToHslTriplet(c.border));
    root.style.setProperty("--ring", hexToHslTriplet(c.primary));
    root.style.setProperty("--background", hexToHslTriplet(c.background));
    root.style.setProperty("--card", hexToHslTriplet(c.card));
    root.style.setProperty("--popover", hexToHslTriplet(c.card));
    root.style.setProperty("--foreground", hexToHslTriplet(c.foreground));
    root.style.setProperty("--card-foreground", hexToHslTriplet(c.foreground));
    root.style.setProperty("--popover-foreground", hexToHslTriplet(c.foreground));
    root.style.setProperty("--success", hexToHslTriplet(c.success));
    root.style.setProperty("--accent", hexToHslTriplet(c.success));
    root.style.setProperty("--warning", hexToHslTriplet(c.warning));
    root.style.setProperty("--destructive", hexToHslTriplet(c.destructive));
    root.style.setProperty("--info", hexToHslTriplet(c.info));
    root.style.setProperty("--sidebar-primary", hexToHslTriplet(c.primary));
    root.style.setProperty("--sidebar-border", hexToHslTriplet(c.border));
  }, [config.colors]);

  const save = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(config));

  const reset = () => {
    localStorage.removeItem(STORAGE_KEY);
    setConfig(DEFAULT_VISUAL_THEME);
  };

  const backgroundForPath = (pathname: string) => {
    const key =
      pathname === "/login" ? "login" :
      pathname === "/" ? "home" :
      pathname.startsWith("/checkin") ? "checkin" :
      pathname.startsWith("/manual") ? "manual" :
      pathname.startsWith("/temporary") ? "temporary" :
      pathname.startsWith("/dashboard") ? "dashboard" :
      pathname.startsWith("/personnel") ? "personnel" :
      pathname.startsWith("/visits") ? "visits" :
      "default";
    return config.backgrounds[key] || config.backgrounds.default;
  };

  const value = useMemo(() => ({ config, setConfig, save, reset, backgroundForPath }), [config]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useVisualTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useVisualTheme must be used inside VisualThemeProvider");
  return value;
}
