import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { View, Platform, useColorScheme as useDeviceScheme } from "react-native";
import { colorScheme as nwColorScheme, vars } from "nativewind";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-provider";
import {
  DEFAULT_ACCENT,
  DEFAULT_MODE,
  resolveAccentVars,
  type ThemeMode,
} from "@/constants/theme";

const KEY_MODE = "trippl.theme_mode";
const KEY_ACCENT = "trippl.accent_color";
const KEY_FORCE = "trippl.force_own_accent";

type ThemeState = {
  mode: ThemeMode; // 'light' | 'dark' | 'system'
  accent: string; // stored base hex (preset light value or a custom hex)
  scheme: "light" | "dark"; // effective scheme after resolving 'system'
  accentInk: string; // the accent as a visible text/stroke color (for progress, etc.)
  forceOwnAccent: boolean; // "always use my own accent" — overrides destination themes
  setMode: (mode: ThemeMode) => void;
  setAccent: (hex: string) => void;
  setForceOwnAccent: (value: boolean) => void;
};

const ThemeContext = createContext<ThemeState | undefined>(undefined);

// Mode + accent (+ the "always use my own accent" override), persisted to the
// Supabase profile AND AsyncStorage (local wins for instant/offline; the profile
// reconciles across devices on sign-in). Accent is applied as a runtime CSS
// variable so it recolors the whole app live.
export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const device = useDeviceScheme(); // OS scheme (reactive), independent of NativeWind
  const [mode, setModeState] = useState<ThemeMode>(DEFAULT_MODE);
  const [accent, setAccentState] = useState<string>(DEFAULT_ACCENT);
  const [forceOwnAccent, setForceState] = useState<boolean>(false);

  // Resolve 'system' → a concrete scheme ourselves, then push the concrete scheme
  // to NativeWind. ('system' with darkMode:"class" doesn't toggle the .dark class
  // on web, so we also toggle it explicitly on the document element.)
  const scheme: "light" | "dark" =
    mode === "system" ? (device === "dark" ? "dark" : "light") : mode;

  useEffect(() => {
    nwColorScheme.set(scheme);
    if (Platform.OS === "web" && typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", scheme === "dark");
    }
  }, [scheme]);

  // Instant: hydrate from local storage on start (offline-safe).
  useEffect(() => {
    (async () => {
      const [m, a, f] = await Promise.all([
        AsyncStorage.getItem(KEY_MODE),
        AsyncStorage.getItem(KEY_ACCENT),
        AsyncStorage.getItem(KEY_FORCE),
      ]);
      if (m === "light" || m === "dark" || m === "system") setModeState(m);
      if (a) setAccentState(a);
      if (f === "true" || f === "false") setForceState(f === "true");
    })();
  }, []);

  // Reconcile with the profile once signed in (cross-device source of truth).
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("theme_mode, accent_color, force_own_accent")
        .eq("id", user.id)
        .maybeSingle();
      const m = data?.theme_mode as ThemeMode | undefined;
      const a = data?.accent_color as string | undefined;
      const f = data?.force_own_accent as boolean | undefined;
      if (m === "light" || m === "dark" || m === "system") {
        setModeState(m);
        AsyncStorage.setItem(KEY_MODE, m);
      }
      if (a) {
        setAccentState(a);
        AsyncStorage.setItem(KEY_ACCENT, a);
      }
      if (typeof f === "boolean") {
        setForceState(f);
        AsyncStorage.setItem(KEY_FORCE, String(f));
      }
    })();
  }, [user]);

  const setMode = useCallback(
    (m: ThemeMode) => {
      setModeState(m);
      AsyncStorage.setItem(KEY_MODE, m);
      if (user) supabase.from("profiles").update({ theme_mode: m }).eq("id", user.id);
    },
    [user],
  );

  const setAccent = useCallback(
    (a: string) => {
      setAccentState(a);
      AsyncStorage.setItem(KEY_ACCENT, a);
      if (user) supabase.from("profiles").update({ accent_color: a }).eq("id", user.id);
    },
    [user],
  );

  const setForceOwnAccent = useCallback(
    (value: boolean) => {
      setForceState(value);
      AsyncStorage.setItem(KEY_FORCE, String(value));
      if (user) {
        supabase.from("profiles").update({ force_own_accent: value }).eq("id", user.id);
      }
    },
    [user],
  );

  const { fill, ink, fg } = resolveAccentVars(accent, scheme);
  const accentVars = vars({
    "--accent": ink, // accent as text/stroke/border — always visible
    "--accent-fill": fill, // solid fill ('transparent' → outlined control)
    "--accent-fg": fg, // label on the fill (contrast-checked)
  });

  return (
    <ThemeContext.Provider
      value={{
        mode,
        accent,
        scheme,
        accentInk: ink,
        forceOwnAccent,
        setMode,
        setAccent,
        setForceOwnAccent,
      }}
    >
      <View style={[{ flex: 1 }, accentVars]}>{children}</View>
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeState {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within <ThemeProvider>");
  return ctx;
}
