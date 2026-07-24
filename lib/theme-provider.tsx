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
  resolveAccentVars,
  type ThemeMode,
} from "@/constants/theme";
import {
  DEFAULT_SKIN,
  isSkin,
  skinNeutral,
  type Skin,
  type SkinNeutral,
} from "@/constants/skins";
import {
  resolveTheme,
  tokenNeutralVars,
  type ThemeTokens,
} from "@/constants/design-tokens";

const KEY_MODE = "trippl.theme_mode";
const KEY_ACCENT = "trippl.accent_color";
const KEY_FORCE = "trippl.force_own_accent";
const KEY_SKIN = "trippl.app_skin";

type ThemeState = {
  mode: ThemeMode; // 'light' | 'dark' | 'system'
  accent: string; // stored base hex (preset light value or a custom hex)
  scheme: "light" | "dark"; // effective scheme after resolving 'system'
  accentInk: string; // the accent as a visible text/stroke color (for progress, etc.)
  forceOwnAccent: boolean; // "always use my own accent" — overrides destination themes
  skin: Skin; // the user's selected visual skin (global; look-only)
  neutrals: SkinNeutral; // current skin × scheme neutrals (for JS/native color consumers)
  tokens: ThemeTokens; // the full ported design-system token set for the current skin × mode
  setMode: (mode: ThemeMode) => void;
  setAccent: (hex: string) => void;
  setForceOwnAccent: (value: boolean) => void;
  setSkin: (skin: Skin) => void;
};

const ThemeContext = createContext<ThemeState | undefined>(undefined);

// Mode + accent + skin (+ the "always use my own accent" override), persisted to
// the Supabase profile AND AsyncStorage (local wins for instant/offline; the
// profile reconciles across devices on sign-in). Neutrals + accent are applied as
// runtime CSS variables — the current SKIN's neutral/radius tokens plus the accent
// — so the whole app re-skins + recolors live.
export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const device = useDeviceScheme(); // OS scheme (reactive), independent of NativeWind
  const [mode, setModeState] = useState<ThemeMode>(DEFAULT_MODE);
  const [accent, setAccentState] = useState<string>(DEFAULT_ACCENT);
  const [forceOwnAccent, setForceState] = useState<boolean>(false);
  const [skin, setSkinState] = useState<Skin>(DEFAULT_SKIN);

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
      const [m, a, f, sk] = await Promise.all([
        AsyncStorage.getItem(KEY_MODE),
        AsyncStorage.getItem(KEY_ACCENT),
        AsyncStorage.getItem(KEY_FORCE),
        AsyncStorage.getItem(KEY_SKIN),
      ]);
      if (m === "light" || m === "dark" || m === "system") setModeState(m);
      if (a) setAccentState(a);
      if (f === "true" || f === "false") setForceState(f === "true");
      if (isSkin(sk)) setSkinState(sk);
    })();
  }, []);

  // Reconcile with the profile once signed in (cross-device source of truth).
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("theme_mode, accent_color, force_own_accent, app_skin")
        .eq("id", user.id)
        .maybeSingle();
      const m = data?.theme_mode as ThemeMode | undefined;
      const a = data?.accent_color as string | undefined;
      const f = data?.force_own_accent as boolean | undefined;
      const sk = data?.app_skin as Skin | undefined;
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
      if (isSkin(sk)) {
        setSkinState(sk);
        AsyncStorage.setItem(KEY_SKIN, sk);
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

  const setSkin = useCallback(
    (s: Skin) => {
      setSkinState(s);
      AsyncStorage.setItem(KEY_SKIN, s);
      if (user) supabase.from("profiles").update({ app_skin: s }).eq("id", user.id);
    },
    [user],
  );

  // The full ported token set for this skin × mode. Editorial uses the user's
  // accent (mode-aware); collage/poster override it with their signature accent.
  const tokens = resolveTheme(skin, scheme, accentForScheme(accent, scheme));
  const neutrals = skinNeutral(skin, scheme);

  // Accent CSS vars. Editorial keeps the picker's outlined-when-invisible behaviour
  // (White / near-bg accents → outlined). Collage/Poster use their fixed accent.
  const { fill, ink, fg } = resolveAccentVars(accent, scheme);
  const accentVars =
    skin === "editorial"
      ? { "--accent": ink, "--accent-fill": fill, "--accent-fg": fg }
      : { "--accent": tokens.accent, "--accent-fill": tokens.accentBg, "--accent-fg": tokens.accentInk };
  const effectiveInk = skin === "editorial" ? ink : tokens.accent;

  // One vars() call: the skin's neutral + radius tokens, plus the accent.
  const rootVars = vars({ ...tokenNeutralVars(tokens), ...accentVars });

  return (
    <ThemeContext.Provider
      value={{
        mode,
        accent,
        scheme,
        accentInk: effectiveInk,
        forceOwnAccent,
        skin,
        neutrals,
        tokens,
        setMode,
        setAccent,
        setForceOwnAccent,
        setSkin,
      }}
    >
      <View style={[{ flex: 1 }, rootVars]}>{children}</View>
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeState {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within <ThemeProvider>");
  return ctx;
}
