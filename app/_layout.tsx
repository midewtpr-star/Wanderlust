import "../global.css";
import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";
import { AuthProvider, useAuth } from "@/lib/auth-provider";

// Keep the splash screen up until we know whether there's a session, to avoid a
// flash of the wrong route.
SplashScreen.preventAutoHideAsync();

// Route protection: signed-out users are sent to (auth), except on PUBLIC routes.
// Invite landing (/join/[code]) is public so an invitee can preview before signing
// in. The signed-in → leave-(auth) redirect is handled by the sign-in screen itself,
// so it can honor a ?redirect= deep-link target.
function RootNavigator() {
  const { session, loading } = useAuth();
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

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="trip/[id]" options={{ headerShown: true, title: "Trip" }} />
      <Stack.Screen name="join/[code]" options={{ headerShown: true, title: "Trip invite" }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <RootNavigator />
          <StatusBar style="auto" />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
