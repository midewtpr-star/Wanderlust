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
  accentForScheme,
  contrastOn,
  type ThemeMode,
} from "@/constants/theme";

const KEY_MODE = "calor.theme_mode";
const KEY_ACCENT = "calor.accent_color";

type ThemeState = {
  mode: ThemeMode; // 'light' | 'dark' | 'system'
  accent: string; // stored base hex (preset light value or a custom hex)
  scheme: "light" | "dark"; // effective scheme after resolving 'system'
  setMode: (mode: ThemeMode) => void;
  setAccent: (hex: string) => void;
};

const ThemeContext = createContext<ThemeState | undefined>(undefined);

// Mode + accent, persisted to the Supabase profile AND AsyncStorage (local wins
// for instant/offline; the profile reconciles across devices on sign-in). Accent
// is applied as a runtime CSS variable so it recolors the whole app live.
export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const device = useDeviceScheme(); // OS scheme (reactive), independent of NativeWind
  const [mode, setModeState] = useState<ThemeMode>(DEFAULT_MODE);
  const [accent, setAccentState] = useState<string>(DEFAULT_ACCENT);

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
      const [m, a] = await Promise.all([
        AsyncStorage.getItem(KEY_MODE),
        AsyncStorage.getItem(KEY_ACCENT),
      ]);
      if (m === "light" || m === "dark" || m === "system") setModeState(m);
      if (a) setAccentState(a);
    })();
  }, []);

  // Reconcile with the profile once signed in (cross-device source of truth).
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("theme_mode, accent_color")
        .eq("id", user.id)
        .maybeSingle();
      const m = data?.theme_mode as ThemeMode | undefined;
      const a = data?.accent_color as string | undefined;
      if (m === "light" || m === "dark" || m === "system") {
        setModeState(m);
        AsyncStorage.setItem(KEY_MODE, m);
      }
      if (a) {
        setAccentState(a);
        AsyncStorage.setItem(KEY_ACCENT, a);
      }
    })();
  }, [user]);

  const persist = useCallback(
    (m: ThemeMode, a: string) => {
      AsyncStorage.setItem(KEY_MODE, m);
      AsyncStorage.setItem(KEY_ACCENT, a);
      if (user) {
        supabase
          .from("profiles")
          .update({ theme_mode: m, accent_color: a })
          .eq("id", user.id);
      }
    },
    [user],
  );

  const setMode = useCallback(
    (m: ThemeMode) => {
      setModeState(m);
      persist(m, accent);
    },
    [accent, persist],
  );

  const setAccent = useCallback(
    (a: string) => {
      setAccentState(a);
      persist(mode, a);
    },
    [mode, persist],
  );

  const accentHex = accentForScheme(accent, scheme);
  const accentVars = vars({
    "--accent": accentHex,
    "--accent-fg": contrastOn(accentHex),
  });

  return (
    <ThemeContext.Provider value={{ mode, accent, scheme, setMode, setAccent }}>
      <View style={[{ flex: 1 }, accentVars]}>{children}</View>
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeState {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within <ThemeProvider>");
  return ctx;
}
