import type { ExpoConfig } from "expo/config";

// Trippl — dynamic Expo app config.
// Dynamic (vs static app.json) so environment variables can flow into `extra`,
// read back through expo-constants in lib/supabase.ts.
//
// Branding is LOCKED (Phase 10, decisions.md D11): name "Trippl", slug/scheme
// "trippl", ids com.trippl.app. The Trippl brushstroke mark drives the icon +
// splash (assets/logo/trippl-mark*.png).
const config: ExpoConfig = {
  name: "Trippl",
  slug: "trippl",
  version: "1.0.0",
  // OTA + native-build compatibility key: `eas update` ships JS-only updates to
  // builds sharing this runtime version. Bump native deps ⇒ bump the app version.
  runtimeVersion: { policy: "appVersion" },
  // owner: "your-expo-username-or-org", // set to your Expo account/org for EAS (see docs/deploy.md)
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  // Deep-link scheme (D2). Invite links resolve to app/join/[code]:
  //   native  → trippl://join/<code>
  //   web     → <web-origin>/join/<code>
  // Expo Router derives the linking config from the file routes + this scheme.
  // TODO (production universal/app links): add iOS `ios.associatedDomains`
  //   (applinks:yourdomain.com) + Android `android.intentFilters` for
  //   https://yourdomain.com/join/* and host an AASA + assetlinks.json, so the
  //   web URL opens the installed app directly. Custom scheme + web URL is fine for now.
  scheme: "trippl",
  userInterfaceStyle: "automatic",
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.trippl.app",
    // Standard HTTPS/crypto only → declare no non-exempt encryption, so App Store
    // Connect skips the export-compliance question on every submission.
    infoPlist: { ITSAppUsesNonExemptEncryption: false },
  },
  android: {
    package: "com.trippl.app",
    adaptiveIcon: {
      // Thin mark → generous padding on a solid white plate so it reads small.
      backgroundColor: "#FFFFFF",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
  },
  web: {
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    // Splash: the mark on a solid plate — black on white (light), white on
    // dark-grey (dark), matching the Trippl theme neutrals.
    [
      "expo-splash-screen",
      {
        backgroundColor: "#FFFFFF",
        image: "./assets/images/splash-icon.png",
        imageWidth: 140,
        dark: {
          backgroundColor: "#1C1C1E",
          image: "./assets/logo/trippl-mark-white.png",
          imageWidth: 140,
        },
      },
    ],
    // Bundle Inter as the cross-platform fallback font (Apple devices still get
    // the real system font / San Francisco). SF Pro is never bundled (licensing).
    [
      "expo-font",
      {
        fonts: [
          "node_modules/@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf",
          "node_modules/@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf",
          "node_modules/@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf",
          "node_modules/@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf",
        ],
      },
    ],
    // Flight itineraries + trip media (D6, Phase 8, journal).
    [
      "expo-image-picker",
      {
        photosPermission:
          "Trippl accesses your photos so you can add trip photos and videos, a cover image, or a flight itinerary.",
        cameraPermission:
          "Trippl uses the camera so you can photograph your flight itinerary or capture trip photos and videos.",
      },
    ],
    [
      "expo-camera",
      {
        cameraPermission:
          "Trippl uses the camera so you can photograph your flight itinerary or capture trip photos and videos.",
        recordAudioAndroid: false,
      },
    ],
    // Opt-in trip-mileage for the post-trip recap (D9). NOTE: Nearby Travelers
    // does NOT use device location — it matches on the trip's public destination
    // (a coarse geohash), so location is requested ONLY for recap mileage.
    [
      "expo-location",
      {
        locationWhenInUsePermission:
          "Trippl can use your location, only if you opt in, to tally the miles you travelled for your trip recap. It is never shared with other travelers.",
      },
    ],
    // Video playback for activity/journal media (Phase 8).
    "expo-video",
    // Audio PREVIEW playback for the (optional, operator-configured) music picker
    // (B6). Playback only — Trippl never records audio, so no microphone permission.
    ["expo-audio", { microphonePermission: false }],
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
    // (e.g. https://trippl.vercel.app). On web we fall back to window.location.origin.
    webUrl: process.env.EXPO_PUBLIC_WEB_URL,
    // Populated by `eas init` (it prints the EAS project ID). Enables Expo push
    // tokens (lib/push.ts) + EAS Update; in EAS builds it is also auto-injected.
    eas: { projectId: process.env.EAS_PROJECT_ID },
  },
};

export default config;
