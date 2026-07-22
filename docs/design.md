# Calor — Design System

> **What this governs:** the brand identity + theming/typography system applied in Phase 10 (build-plan). Resolves the placeholder from `decisions.md` D11. Source-of-truth for tokens lives in code (`global.css`, `tailwind.config.js`, `constants/theme.ts`); this doc is the rationale + reference.

## Identity

- **Name:** Calor. `name`/`slug`/`scheme` = `calor`, ids `com.calor.app`. The old `AppName`/`appname` placeholders are fully replaced.
- **Mark:** a minimal, hand-drawn black brushstroke — a large open circle (gap upper-right) with a small detached arc floating above. Files: `assets/logo/calor-mark.png` (black) and `assets/logo/calor-mark-white.png` (white, for dark mode). The `<Logo>` / `<LogoLockup>` components (`components/logo-slot.tsx`) auto-swap black↔white by theme. Drop in an exact PNG at those paths to replace the traced recreation — everything else stays wired.
- **Placement:** auth screens (mark + wordmark), the Trips header (nav), and the splash screen. App icon + splash + favicon + Android adaptive/monochrome are generated from the mark on a solid white plate with generous padding (the stroke is thin — it needs the padding to read at small sizes).

## Theming

- **`ThemeProvider`** (`lib/theme-provider.tsx`) exposes `mode` (`light | dark | system`, default `system`), `accent` (hex), the effective `scheme`, and `setMode` / `setAccent`.
- **Persistence:** both `mode` and `accent` are written to **AsyncStorage** (instant, offline) **and** the Supabase **profile** (`profiles.theme_mode`, `profiles.accent_color`) — local applies immediately; the profile reconciles across devices on sign-in.
- **Mode:** we resolve `system` → a concrete scheme ourselves (from the OS), push it to NativeWind, and toggle the `.dark` class on the web document (NativeWind's `system` + `darkMode:"class"` does not toggle the class on web).
- **Accent = runtime CSS variable.** `--accent` (+ its contrast `--accent-fg`) is a **raw color** var. `tailwind.config` maps `primary`, `accent`, and `ring` to `var(--accent)`, so any accent (including an arbitrary custom hex) recolors the app **live**. The ThemeProvider sets it via NativeWind `vars()` on a root wrapper (works web + native). Default baked into `global.css` = Red.

### Neutral tokens (HSL vars in `global.css`; Apple-like)

| Token | Light | Dark |
|---|---|---|
| bg (`background`) | `#FFFFFF` | `#1C1C1E` (dark grey, **not** pure black) |
| surface (`card`/`muted`/`secondary`) | `#F5F5F7` | `#2C2C2E` |
| text (`foreground`) | `#000000` | `#FFFFFF` |
| text-secondary (`muted-foreground`) | `#6E6E73` | `#AEAEB2` |
| border (`border`/`input`) | `#E5E5EA` | `#38383A` |

`destructive` stays a fixed iOS red (semantic: delete/error), independent of the accent.

### Accent presets (light / dark variant each; default = Red)

| Name | Light | Dark |
|---|---|---|
| **Red** (default) | `#FF3B30` | `#FF453A` |
| Blue | `#007AFF` | `#0A84FF` |
| Green | `#34C759` | `#30D158` |
| Yellow | `#FFCC00` | `#FFD60A` |
| **Custom** | any hex (color picker in Settings) | same hex |

The accent drives interactive/primary elements only — primary buttons, links, active states, selected toggles, progress fills, and the verified badge — **bold but sparse**. Neutrals carry everything else. Contrast text on the accent (`--accent-fg`) is computed from luminance (dark text on yellow, white text otherwise).

## Typography

- **System font primary** (no `fontFamily` on iOS → real San Francisco; web uses a `-apple-system, …, "Inter", …` stack so Apple devices get SF and others get Inter).
- **Inter bundled** as the cross-platform fallback (`@expo-google-fonts/inter` via the `expo-font` plugin); applied per-weight on Android. **SF Pro is never bundled** (licensing).
- **Type scale** (`constants/theme.ts` `TYPE`, two Apple-like roles): `display-xl` (40/700, tight tracking), `display-lg` (30/700), `title` (22/600), `heading`, `body` (16/400), `caption` (13). Exposed as `<Text variant="…">`.

## Aesthetic

Editorial + slick-modern: generous whitespace, big confident headers (display styles), a black/white foundation with the single accent, restraint. Rounded/tactile controls (`rounded-xl`/`2xl`), hairline borders using the `border` token, soft card elevation, and the existing reanimated verified/step animations retained. All screens use the shared primitives (`Button`, `Card`, `Text`, `Input`) + tokens, so nothing reads as default Tailwind.
