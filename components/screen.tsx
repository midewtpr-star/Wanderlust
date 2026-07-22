import type { ReactNode } from "react";
import { View, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

// Shared placeholder screen shell. NativeWind-styled so we can confirm Tailwind
// classes apply across web / iOS / Android. Real screens replace these in later phases.
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
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <ScrollView contentContainerClassName="grow p-6">
        <View className={cn("flex-1 items-center justify-center gap-4", className)}>
          <Text variant="title" className="text-center">
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
    </View>
  );
}
