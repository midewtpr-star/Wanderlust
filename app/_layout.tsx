import "../global.css";
import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import {
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_600SemiBold_Italic,
  PlayfairDisplay_700Bold,
} from "@expo-google-fonts/playfair-display";
import { Anton_400Regular } from "@expo-google-fonts/anton";
import {
  Archivo_400Regular,
  Archivo_700Bold,
  Archivo_900Black,
} from "@expo-google-fonts/archivo";
import { SpaceMono_400Regular, SpaceMono_700Bold } from "@expo-google-fonts/space-mono";
import { GreatVibes_400Regular } from "@expo-google-fonts/great-vibes";
import { AuthProvider, useAuth } from "@/lib/auth-provider";
import { ThemeProvider, useTheme } from "@/lib/theme-provider";
import { fontFamily } from "@/constants/theme";

// Keep the splash screen up until we know the session (and fonts), to avoid a
// flash of the wrong route / unstyled text.
SplashScreen.preventAutoHideAsync();

// Route protection: signed-out users are sent to (auth), except on PUBLIC routes.
function RootNavigator() {
  const { session, loading } = useAuth();
  const { neutrals } = useTheme();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    SplashScreen.hideAsync();
    const inPublic =
      segments[0] === "(auth)" || segments[0] === "join" || segments[0] === "dev";
    if (!session && !inPublic) {
      router.replace("/sign-in");
    }
  }, [session, loading, segments, router]);

  const n = neutrals; // current skin × scheme
  // Themed native headers (flat — no shadow, neutral background per skin).
  const themedHeader = {
    headerStyle: { backgroundColor: n.bg },
    headerTintColor: n.text,
    headerTitleStyle: { color: n.text, fontFamily: fontFamily("semibold") },
    headerShadowVisible: false,
    contentStyle: { backgroundColor: n.bg },
  };

  return (
    <Stack screenOptions={{ headerShown: false, ...themedHeader }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="trip/[id]" options={{ headerShown: true, title: "Trip" }} />
      <Stack.Screen name="chat/[id]" options={{ headerShown: true, title: "Chat" }} />
      <Stack.Screen name="outfits/[id]" options={{ headerShown: true, title: "Outfits" }} />
      <Stack.Screen name="outfit/[id]" options={{ headerShown: true, title: "Outfit" }} />
      <Stack.Screen name="bring/[id]" options={{ headerShown: true, title: "Bring list" }} />
      <Stack.Screen name="activity/[id]" options={{ headerShown: true, title: "Activity" }} />
      <Stack.Screen name="recap/[id]" options={{ headerShown: true, title: "Trip recap" }} />
      <Stack.Screen name="join/[code]" options={{ headerShown: true, title: "Trip invite" }} />
      <Stack.Screen name="passport" options={{ headerShown: true, title: "Passport" }} />
      <Stack.Screen name="profile/[id]" options={{ headerShown: true, title: "Profile" }} />
      <Stack.Screen name="connections" options={{ headerShown: true, title: "Connections" }} />
      <Stack.Screen name="profile-edit" options={{ headerShown: true, title: "Edit profile" }} />
      <Stack.Screen name="moderation" options={{ headerShown: true, title: "Moderation" }} />
      <Stack.Screen name="nearby/[id]" options={{ headerShown: true, title: "Nearby travelers" }} />
      <Stack.Screen name="dev/design" options={{ headerShown: true, title: "Design tokens" }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    // Per-skin display / body fonts (design system). Editorial serif, Poster
    // condensed + script, Collage/Poster Archivo + Space Mono. SF Pro never bundled.
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_600SemiBold_Italic,
    PlayfairDisplay_700Bold,
    Anton_400Regular,
    Archivo_400Regular,
    Archivo_700Bold,
    Archivo_900Black,
    SpaceMono_400Regular,
    SpaceMono_700Bold,
    GreatVibes_400Regular,
  });

  if (!fontsLoaded && !fontError) return null; // splash stays up

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <ThemeProvider>
            <RootNavigator />
            <StatusBar style="auto" />
          </ThemeProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
