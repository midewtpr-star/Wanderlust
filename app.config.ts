import type { ExpoConfig } from "expo/config";

// AppName — dynamic Expo app config.
// Dynamic (vs static app.json) so environment variables can flow into `extra`,
// read back through expo-constants in lib/supabase.ts.
//
// "AppName", scheme "appname", and the com.appname.app ids are PLACEHOLDERS
// (decisions.md D11) — find-and-replace during the branding phase.
//
// Native-module plugins + permission strings are configured here (D1/D6/D10) but
// NO native logic is wired up yet — this is scaffold only.
const config: ExpoConfig = {
  name: "AppName",
  slug: "appname",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  // Deep-link scheme (D2). Invite links resolve to app/join/[code]:
  //   native  → appname://join/<code>
  //   web     → <web-origin>/join/<code>
  // Expo Router derives the linking config from the file routes + this scheme.
  // TODO (production universal/app links): add iOS `ios.associatedDomains`
  //   (applinks:yourdomain.com) + Android `android.intentFilters` for
  //   https://yourdomain.com/join/* and host an AASA + assetlinks.json, so the
  //   web URL opens the installed app directly. Custom scheme + web URL is fine for now.
  scheme: "appname",
  userInterfaceStyle: "automatic",
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.appname.app",
    icon: "./assets/expo.icon",
  },
  android: {
    package: "com.appname.app",
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
  },
  web: {
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        backgroundColor: "#208AEF",
        image: "./assets/images/splash-icon.png",
        imageWidth: 76,
      },
    ],
    // Flight itineraries + trip media (D6). Permissions declared; logic added later.
    [
      "expo-image-picker",
      {
        photosPermission:
          "AppName accesses your photos so you can add a trip cover or upload a flight itinerary.",
        cameraPermission:
          "AppName uses the camera so you can photograph your flight itinerary.",
      },
    ],
    [
      "expo-camera",
      {
        cameraPermission:
          "AppName uses the camera so you can photograph your flight itinerary.",
        recordAudioAndroid: false,
      },
    ],
    // Miles / places for the post-trip recap (D9).
    [
      "expo-location",
      {
        locationWhenInUsePermission:
          "AppName uses your location to tally trip miles for your recap.",
      },
    ],
    // Push notifications (D10).
    "expo-notifications",
  ],
  experiments: {
    typedRoutes: false,
  },
  extra: {
    // Read in lib/supabase.ts via expo-constants (falls back to process.env).
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    // Optional deployed web origin used to build shareable invite links on native
    // (e.g. https://appname.vercel.app). On web we fall back to window.location.origin.
    webUrl: process.env.EXPO_PUBLIC_WEB_URL,
  },
};

export default config;
