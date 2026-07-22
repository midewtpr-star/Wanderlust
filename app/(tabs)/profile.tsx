import { View } from "react-native";
import { useRouter } from "expo-router";
import { Screen } from "@/components/screen";
import { Button } from "@/components/ui/button";

// Profile (placeholder).
export default function ProfileScreen() {
  const router = useRouter();
  return (
    <Screen title="Profile" subtitle="Your profile and settings. Placeholder.">
      <View className="w-full max-w-sm">
        <Button
          label="Go to sign-in (placeholder)"
          variant="outline"
          onPress={() => router.push("/sign-in")}
        />
      </View>
    </Screen>
  );
}
