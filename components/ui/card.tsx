import { View, type ViewProps } from "react-native";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/theme-provider";

// Trippl card, token-driven per the design system. The active skin sets the
// surface colour, border (editorial hairline / collage 1.5px hard black / poster
// none) and corner radius. Editorial keeps a soft elevation; poster is flat and
// printed; collage is flat here — its hard offset shadow is applied per-card via
// <HardShadow> where the layout allows (design system → Collage).
export function Card({
  className,
  style,
  ...props
}: ViewProps & { className?: string }) {
  const { tokens: t } = useTheme();
  const elevation =
    t.skin === "editorial"
      ? {
          shadowColor: "#000",
          shadowOpacity: 0.05,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 1,
        }
      : { elevation: 0 };
  return (
    <View
      className={cn("p-4", className)}
      style={[
        {
          backgroundColor: t.cardBg,
          borderRadius: t.radius,
          borderWidth: t.cardBorder?.width ?? 0,
          borderColor: t.cardBorder?.color,
        },
        elevation,
        style,
      ]}
      {...props}
    />
  );
}
