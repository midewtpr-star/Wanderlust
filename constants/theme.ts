// AppName — theme tokens (PLACEHOLDER).
// The real palette/typography come from the locked design later (the UI trio is
// pending in the docs). These mirror the neutral placeholder values in global.css
// so code that can't read CSS variables (e.g. React Navigation) stays in sync. D11.

export const APP_NAME = "AppName";

export const NAV_THEME = {
  light: {
    background: "hsl(0 0% 100%)",
    foreground: "hsl(240 10% 3.9%)",
    primary: "hsl(240 5.9% 10%)",
    border: "hsl(240 5.9% 90%)",
    card: "hsl(0 0% 100%)",
  },
  dark: {
    background: "hsl(240 10% 3.9%)",
    foreground: "hsl(0 0% 98%)",
    primary: "hsl(0 0% 98%)",
    border: "hsl(240 3.7% 15.9%)",
    card: "hsl(240 10% 3.9%)",
  },
} as const;
