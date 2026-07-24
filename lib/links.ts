import { Platform } from "react-native";
import * as Linking from "expo-linking";
import Constants from "expo-constants";

// Build the shareable invite links for an invite code.
// - webUrl: <web-origin>/join/<code> — opens in a browser (and, once universal
//   links are configured, the installed app). Null on native if no web origin is set.
// - nativeUrl: the app's scheme URL via expo-linking (trippl://join/<code> in a
//   build; an exp:// URL in Expo Go dev).
// - shareUrl: the best single link to share (prefer the web URL).
export function buildInviteLinks(code: string): {
  webUrl: string | null;
  nativeUrl: string;
  shareUrl: string;
} {
  const path = `/join/${code}`;

  const configuredWeb =
    (Constants.expoConfig?.extra as { webUrl?: string } | undefined)?.webUrl ??
    process.env.EXPO_PUBLIC_WEB_URL;

  let webOrigin: string | null = configuredWeb ?? null;
  if (!webOrigin && Platform.OS === "web" && typeof window !== "undefined") {
    webOrigin = window.location.origin;
  }
  const webUrl = webOrigin ? `${webOrigin.replace(/\/$/, "")}${path}` : null;

  const nativeUrl = Linking.createURL(path);

  return { webUrl, nativeUrl, shareUrl: webUrl ?? nativeUrl };
}
