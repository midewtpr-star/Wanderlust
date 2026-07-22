import "react-native-url-polyfill/auto";
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
  // The scaffold runs without real credentials. Anything that actually talks to
  // Supabase will fail until you copy .env.example to .env and fill these in.
  console.warn(
    "[supabase] Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY — " +
      "using a placeholder client. Copy .env.example to .env and add your project credentials.",
  );
}

// The single, app-wide Supabase client (decisions.md D1/D12).
// NOTE: auth session persistence (AsyncStorage) and phone-first auth are wired up
// later in build-plan Phase 1 (D4) — intentionally omitted from the scaffold.
export const supabase = createClient(
  supabaseUrl ?? "https://placeholder.supabase.co",
  supabaseAnonKey ?? "public-anon-placeholder",
);
