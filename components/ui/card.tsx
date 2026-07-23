import { View, type ViewProps } from "react-native";
import { cn } from "@/lib/utils";
import { skinRadius } from "@/constants/skins";
import { useSkin } from "@/lib/skin";

// Trippl card: hairline border, soft elevation. The active SKIN sets the corner
// radius (editorial rounded 2xl → collage rounded → poster hard-edged) and flattens
// the elevation for the poster's graphic, printed feel.
export function Card({
  className,
  style,
  ...props
}: ViewProps & { className?: string }) {
  const { skin } = useSkin();
  const flat = skin === "poster";
  return (
    <View
      className={cn("border border-border bg-card p-4", skinRadius(skin, "lg"), className)}
      style={[
        flat
          ? { elevation: 0 }
          : {
              shadowColor: "#000",
              shadowOpacity: 0.05,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 4 },
              elevation: 1,
            },
        style,
      ]}
      {...props}
    />
  );
}
