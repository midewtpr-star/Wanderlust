import { View } from "react-native";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

// The Trippl mark is intentionally BLANK for now — final artwork pending. The
// wordmark still renders so branding isn't lost. When the real mark is ready,
// render it here (e.g. an <Image> or SVG) and everything downstream stays wired.
export function Logo({ size = 44 }: { size?: number }) {
  return <View style={{ width: 0, height: size }} />;
}

// Mark (blank) + "Trippl" wordmark lockup, for auth screens and headers.
export function LogoLockup({
  size = 36,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <View className={cn("flex-row items-center gap-2", className)}>
      <Logo size={size} />
      <Text
        className="text-2xl font-bold text-foreground"
        style={{ letterSpacing: -0.5 }}
      >
        Trippl
      </Text>
    </View>
  );
}

export function LogoSlot({ className }: { className?: string }) {
  return <LogoLockup className={cn("py-1", className)} />;
}
