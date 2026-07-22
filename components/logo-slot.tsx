import { View, Image } from "react-native";
import { Text } from "@/components/ui/text";
import { useTheme } from "@/lib/theme-provider";
import { cn } from "@/lib/utils";

// The Calor brushstroke mark. Black in light mode, white in dark mode (the black
// mark is invisible on dark backgrounds), switched automatically. D11 resolved.
const BLACK = require("../assets/logo/calor-mark.png");
const WHITE = require("../assets/logo/calor-mark-white.png");

export function Logo({ size = 44 }: { size?: number }) {
  const { scheme } = useTheme();
  return (
    <Image
      source={scheme === "dark" ? WHITE : BLACK}
      style={{ width: size, height: size }}
      resizeMode="contain"
    />
  );
}

// Mark + "Calor" wordmark lockup, for auth screens and headers.
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
        Calor
      </Text>
    </View>
  );
}

// Back-compat: screens that imported the old placeholder now get the real logo.
export function LogoSlot({ className }: { className?: string }) {
  return <LogoLockup className={cn("py-1", className)} />;
}
