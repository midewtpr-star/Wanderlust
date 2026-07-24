import "react-native-url-polyfill/auto";
import { AppState, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import Constants from "expo-constants";

// Read credentials from Expo config `extra` (populated from EXPO_PUBLIC_* env in
// app.config.ts), falling back to process.env. NEVER hardcode secrets here.
const extra = (Constants.expoConfig?.extra ?? {}) as {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
};

const supabaseUrl = extra.supabaseUrl ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey =
  extra.supabaseAnonKey ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // The app still boots without real credentials, but auth/network calls will fail
  // until you copy .env.example to .env and fill these in.
  console.warn(
    "[supabase] Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY — " +
      "using a placeholder client. Copy .env.example to .env and add your project credentials.",
  );
}

// During web *static rendering* (Node, no `window`) skip persistent storage so the
// bundle renders without touching localStorage/AsyncStorage. Native + browser both
// have `window` defined and use AsyncStorage.
const canPersist = typeof window !== "undefined";

// The single, app-wide Supabase client (decisions.md D1/D12).
export const supabase = createClient(
  supabaseUrl ?? "https://placeholder.supabase.co",
  supabaseAnonKey ?? "public-anon-placeholder",
  {
    auth: {
      storage: canPersist ? AsyncStorage : undefined,
      autoRefreshToken: true,
      persistSession: true,
      // We use phone OTP and email+password (not magic-link URLs), so URL session
      // detection stays off.
      detectSessionInUrl: false,
    },
  },
);

// Keep the session token fresh while the app is foregrounded (Supabase RN guidance).
// Native only — browsers handle their own refresh timers.
if (canPersist && Platform.OS !== "web") {
  AppState.addEventListener("change", (state) => {
    if (state === "active") supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
