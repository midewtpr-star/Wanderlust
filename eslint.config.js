// Trippl — ESLint (flat config). Uses the official Expo preset.
// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    // Deno edge functions run in a different runtime (Deno globals, jsr: imports)
    // and are linted/deployed by Supabase, not the app bundle.
    ignores: ["dist/*", "dist-native/*", ".expo/*", "supabase/functions/**"],
  },
  {
    rules: {
      // React-Compiler advisory rules that conflict with this codebase's
      // established, correct patterns — kept as warnings, not build-blocking:
      //  • set-state-in-effect: the idiomatic fetch-on-mount every data hook uses
      //    (`useEffect(() => { load(); }, [load])`).
      //  • refs: reading a stable `Animated.Value` / meters ref during render.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
    },
  },
]);
