import { View } from "react-native";
import { Image } from "expo-image";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

function initials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const s = (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
  return s.toUpperCase() || "?";
}

// Round avatar with an initials fallback (no avatar images yet).
export function Avatar({
  name,
  uri,
  size = 36,
  className,
}: {
  name?: string | null;
  uri?: string | null;
  size?: number;
  className?: string;
}) {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        contentFit="cover"
      />
    );
  }
  return (
    <View
      style={{ width: size, height: size, borderRadius: size / 2 }}
      className={cn("items-center justify-center bg-secondary", className)}
    >
      <Text className="text-xs font-semibold text-secondary-foreground">
        {initials(name)}
      </Text>
    </View>
  );
}
