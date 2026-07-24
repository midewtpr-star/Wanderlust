// Trippl — ESLint (flat config). Uses the official Expo preset.
// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    // Build outputs (any dist* export dir, web bundle) + the .expo cache are
    // generated, never hand-edited. Deno edge functions run in a different
    // runtime (Deno globals, jsr: imports), linted/deployed by Supabase.
    ignores: ["dist/**", "dist-*/**", "web-build/**", ".expo/**", "supabase/functions/**"],
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
