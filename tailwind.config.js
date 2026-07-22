/** @type {import('tailwindcss').Config} */
// Calor — Tailwind config for NativeWind v4 (Phase 10; see docs/design.md).
// Neutrals map to HSL-triplet CSS vars in global.css. The ACCENT is a RAW color
// var (--accent) overridden live by the ThemeProvider — primary/accent/ring all
// resolve to it, so changing the accent (incl. a custom hex) recolors instantly.
module.exports = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        // Accent-driven, runtime-overridable (bold but sparse — interactive bits).
        // `--accent` = the visible ink (text/stroke/border); `--accent-fill` = the
        // solid fill (may be 'transparent' → outlined control for mono/near-bg).
        ring: "var(--accent)",
        "accent-fill": "var(--accent-fill)",
        primary: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-fg)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-fg)",
        },
        // Neutrals carry everything else.
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
};
