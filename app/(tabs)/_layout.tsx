import { Tabs } from "expo-router";
import { Text } from "react-native";
import { useTheme } from "@/lib/theme-provider";
import { accentForScheme, fontFamily } from "@/constants/theme";
import { LogoLockup } from "@/components/logo-slot";

// Emoji tab icons keep the app dependency-light and cross-platform.
function TabIcon({ emoji }: { emoji: string }) {
  return <Text style={{ fontSize: 20 }}>{emoji}</Text>;
}

export default function TabsLayout() {
  const { scheme, accent, neutrals } = useTheme();
  const n = neutrals; // current skin × scheme (global chrome follows the skin)
  const accentHex = accentForScheme(accent, scheme);

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: n.bg },
        headerTintColor: n.text,
        headerTitleStyle: { color: n.text, fontFamily: fontFamily("semibold") },
        headerShadowVisible: false,
        tabBarActiveTintColor: accentHex,
        tabBarInactiveTintColor: n.textSecondary,
        tabBarStyle: { backgroundColor: n.bg, borderTopColor: n.border },
        tabBarLabelStyle: { fontFamily: fontFamily("medium") },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Trips",
          headerTitle: () => <LogoLockup size={26} />,
          tabBarIcon: () => <TabIcon emoji="✈️" />,
        }}
      />
      <Tabs.Screen
        name="create"
        options={{ title: "Create", tabBarIcon: () => <TabIcon emoji="➕" /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Profile", tabBarIcon: () => <TabIcon emoji="👤" /> }}
      />
    </Tabs>
  );
}
