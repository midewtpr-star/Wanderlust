import { Platform } from "react-native";
import * as Sharing from "expo-sharing";

export type ShareResult = "shared" | "downloaded" | "unavailable" | "failed";

// Share a captured recap image: native OS share sheet (expo-sharing), or the Web
// Share API with a download fallback on web. `uri` is a file:// path (native) or
// a data URL (web).
export async function shareImage(
  uri: string,
  filename = "trip-recap.png",
): Promise<ShareResult> {
  try {
    if (Platform.OS === "web") {
      const blob = await (await fetch(uri)).blob();
      const file = new File([blob], filename, { type: blob.type || "image/png" });
      const nav = navigator as Navigator & {
        canShare?: (data: unknown) => boolean;
        share?: (data: unknown) => Promise<void>;
      };
      if (nav.share && nav.canShare?.({ files: [file] })) {
        await nav.share({ files: [file], title: "Trip recap" });
        return "shared";
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      return "downloaded";
    }
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: "image/png",
        dialogTitle: "Share your trip recap",
      });
      return "shared";
    }
    return "unavailable";
  } catch {
    return "failed";
  }
}
