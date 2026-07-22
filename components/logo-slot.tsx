import { View, Text } from "react-native";
import { cn } from "@/lib/utils";

// [LOGO SLOT] — clearly-marked placeholder for the AppName logo (TBD, decisions.md D11).
// Replace the contents with the real logo during the branding phase (build-plan Phase 10).
export function LogoSlot({ className }: { className?: string }) {
  return (
    <View
      className={cn(
        "items-center justify-center rounded-xl border border-dashed border-border px-5 py-3",
        className,
      )}
    >
      <Text className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        [ LOGO SLOT ]
      </Text>
    </View>
  );
}
