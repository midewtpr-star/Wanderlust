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
import { AuthProvider, useAuth } from "@/lib/auth-provider";
import { ThemeProvider, useTheme } from "@/lib/theme-provider";
import { NEUTRALS, fontFamily } from "@/constants/theme";

// Keep the splash screen up until we know the session (and fonts), to avoid a
// flash of the wrong route / unstyled text.
SplashScreen.preventAutoHideAsync();

// Route protection: signed-out users are sent to (auth), except on PUBLIC routes.
function RootNavigator() {
  const { session, loading } = useAuth();
  const { scheme } = useTheme();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    SplashScreen.hideAsync();
    const inPublic = segments[0] === "(auth)" || segments[0] === "join";
    if (!session && !inPublic) {
      router.replace("/sign-in");
    }
  }, [session, loading, segments, router]);

  const n = NEUTRALS[scheme];
  // Themed native headers (flat, editorial — no shadow, neutral background).
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
      <Stack.Screen name="activity/[id]" options={{ headerShown: true, title: "Activity" }} />
      <Stack.Screen name="recap/[id]" options={{ headerShown: true, title: "Trip recap" }} />
      <Stack.Screen name="join/[code]" options={{ headerShown: true, title: "Trip invite" }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
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
