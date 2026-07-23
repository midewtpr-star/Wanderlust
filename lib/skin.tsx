import { createContext, useContext, type ReactNode } from "react";
import { View } from "react-native";
import { vars } from "nativewind";
import { useTheme } from "@/lib/theme-provider";
import { skinVars, skinNeutral, type Skin, type SkinNeutral } from "@/constants/skins";

const SkinOverride = createContext<Skin | null>(null);

// Force a subtree to render in a SPECIFIC skin — used by the picker's live
// previews. Sets that skin's neutral/radius CSS vars for the subtree and makes
// useSkin() return it. (Accent vars inherit from the ancestor unchanged.)
export function SkinScope({ skin, children }: { skin: Skin; children: ReactNode }) {
  const { scheme } = useTheme();
  return (
    <SkinOverride.Provider value={skin}>
      <View style={vars(skinVars(skin, scheme))}>{children}</View>
    </SkinOverride.Provider>
  );
}

// The skin in effect here — a SkinScope override if present, else the user's
// global skin — with the matching neutral palette (for JS / native color
// consumers) and the current scheme.
export function useSkin(): {
  skin: Skin;
  neutrals: SkinNeutral;
  scheme: "light" | "dark";
} {
  const override = useContext(SkinOverride);
  const { skin, neutrals, scheme } = useTheme();
  if (override) {
    return { skin: override, neutrals: skinNeutral(override, scheme), scheme };
  }
  return { skin, neutrals, scheme };
}
