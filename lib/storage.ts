import { Platform } from "react-native";
import { decode } from "base64-arraybuffer";
import type { ImagePickerAsset } from "expo-image-picker";
import { supabase } from "@/lib/supabase";

const BUCKET = "trip-covers";

// Upload a picked image to the public `trip-covers` bucket and return its public URL.
// Cross-platform: web uploads the Blob; native decodes the picker's base64 payload.
export async function uploadTripCover(
  asset: ImagePickerAsset,
  userId: string,
): Promise<string> {
  const rawExt = (
    asset.fileName?.split(".").pop() ||
    asset.uri.split(".").pop() ||
    "jpg"
  )
    .split("?")[0]
    .toLowerCase();
  const ext = rawExt === "jpeg" ? "jpg" : rawExt;
  const contentType =
    asset.mimeType ?? (ext === "png" ? "image/png" : "image/jpeg");
  const path = `${userId}/${Date.now()}.${ext}`;

  let body: ArrayBuffer | Blob;
  if (Platform.OS === "web") {
    body = await (await fetch(asset.uri)).blob();
  } else {
    if (!asset.base64) throw new Error("Image had no data — try picking again.");
    body = decode(asset.base64);
  }

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, body, { contentType, upsert: false });
  if (error) throw error;

  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
