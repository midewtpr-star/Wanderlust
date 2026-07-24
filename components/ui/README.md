# components/ui — React Native Reusables primitives

Shadcn-style primitives built on NativeWind (decisions.md **D1**). They style with
Tailwind classes that resolve to the CSS-variable tokens in `global.css` (via
`tailwind.config.js`) — **no raw hex in components**.

Prerequisites are already wired: NativeWind, the `cn` helper (`@/lib/utils`), the
token theme, and the `@/*` path alias.

- `text.tsx` — `Text` with `variant` (default | muted | heading | title)
- `button.tsx` — `Button` with `variant` + `size`

## Adding more

Copy a component from the React Native Reusables docs into this folder, or use its
CLI, then import with `@/components/ui/<name>`:

```sh
npx @react-native-reusables/cli@latest add <component>
```

Keep primitives generic — feature/screen components live outside `ui/`.
