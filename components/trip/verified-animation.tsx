import { View } from "react-native";
import { Text } from "@/components/ui/text";
import { BadgeIn, RingPulse, Confetti } from "@/components/ui/motion";
import { SEMANTIC } from "@/constants/design-tokens";

// The "verified" badge moment (design system § signature moments): the badge
// springs in (badgeIn), a ring pulses out behind it, and — for the full
// celebration — 16 confetti pieces fall. Reduced-motion drops the ring/confetti
// and snaps the badge in. Green = the success semantic (matches the flight scan
// success + the all-verified celebration).
export function VerifiedAnimation({
  label = "Flight itinerary verified",
  color = SEMANTIC.success,
  confetti = true,
}: {
  label?: string;
  color?: string;
  confetti?: boolean;
}) {
  return (
    <View className="items-center justify-center gap-4 py-4">
      <View style={{ width: 128, height: 128, alignItems: "center", justifyContent: "center" }}>
        {confetti ? <Confetti /> : null}
        <View style={{ width: 104, height: 104, alignItems: "center", justifyContent: "center" }}>
          <RingPulse color={color} size={104} />
          <BadgeIn
            style={{
              width: 96,
              height: 96,
              borderRadius: 48,
              backgroundColor: color,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: "#fff", fontSize: 52, fontWeight: "800", lineHeight: 60 }}>✓</Text>
          </BadgeIn>
        </View>
      </View>
      <Text variant="heading" className="text-center">
        {label}
      </Text>
    </View>
  );
}
