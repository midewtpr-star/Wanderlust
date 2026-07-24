import type { ReactNode } from "react";
import { View, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ui/text";
import { ScreenGround } from "@/components/ui/screen-ground";
import { cn } from "@/lib/utils";

// Centered title shell (auth + simple full-screen states). Sits on the per-skin
// ScreenGround (collage grid / poster field / editorial solid); the title uses
// the skin's display font.
export function Screen({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
  className?: string;
}) {
  const insets = useSafeAreaInsets();
  return (
    <ScreenGround style={{ paddingTop: insets.top }}>
      <ScrollView contentContainerClassName="grow p-6">
        <View className={cn("flex-1 items-center justify-center gap-4", className)}>
          <Text variant="display-lg" className="text-center">
            {title}
          </Text>
          {subtitle ? (
            <Text variant="muted" className="max-w-md text-center">
              {subtitle}
            </Text>
          ) : null}
          {children}
        </View>
      </ScrollView>
    </ScreenGround>
  );
}
