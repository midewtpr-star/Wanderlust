import { Platform } from "react-native";
import { decode } from "base64-arraybuffer";
import * as FileSystem from "expo-file-system/legacy";
import type { ImagePickerAsset } from "expo-image-picker";
import { supabase } from "@/lib/supabase";

const BUCKET = "trip-covers";
const ITINERARY_BUCKET = "flight-itineraries";
const TRIP_MEDIA_BUCKET = "trip-media";

// Client-side size guardrail for activity media. Matches the bucket's
// file_size_limit; raise both (and the project's global upload limit) for
// longer videos. Large files are rejected with a friendly message, not silently.
export const MAX_MEDIA_BYTES = 50 * 1024 * 1024; // 50 MB

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

// A file picked from the document picker, image library, or camera, normalized
// to what the itinerary upload needs. `base64` is present for camera captures
// (expo-image-picker with base64:true); otherwise we read the file on native.
export type PickedFile = {
  uri: string;
  name?: string | null;
  mimeType?: string | null;
  base64?: string | null;
  size?: number | null; // bytes, when the picker reports it
};

// Best-effort byte size for the upload guardrail. Prefers the picker-reported
// size; falls back to the blob (web) or FileSystem (native).
export async function fileSize(file: PickedFile): Promise<number | null> {
  if (typeof file.size === "number") return file.size;
  try {
    if (Platform.OS === "web") {
      return (await (await fetch(file.uri)).blob()).size;
    }
    const info = await FileSystem.getInfoAsync(file.uri);
    return info.exists && typeof info.size === "number" ? info.size : null;
  } catch {
    return null;
  }
}

function itineraryExtType(file: PickedFile): { ext: string; contentType: string } {
  const mime = file.mimeType?.toLowerCase() ?? "";
  const rawExt = (
    file.name?.split(".").pop() ||
    file.uri.split("?")[0].split(".").pop() ||
    ""
  ).toLowerCase();
  let ext = rawExt && rawExt.length <= 4 ? rawExt : "";
  if (!ext) {
    if (mime.includes("pdf")) ext = "pdf";
    else if (mime.includes("png")) ext = "png";
    else if (mime.includes("webp")) ext = "webp";
    else ext = "jpg";
  }
  if (ext === "jpeg") ext = "jpg";
  const contentType =
    file.mimeType ||
    (ext === "pdf"
      ? "application/pdf"
      : ext === "png"
        ? "image/png"
        : ext === "webp"
          ? "image/webp"
          : "image/jpeg");
  return { ext, contentType };
}

// Upload a flight itinerary (image or PDF) to the PRIVATE flight-itineraries
// bucket under `<tripId>/<userId>/…`. Returns the storage PATH (not a URL) — the
// bucket is never publicly readable; view via signedItineraryUrl(). D6.
// Cross-platform: web uploads the Blob; native decodes base64 (from the camera,
// or read off disk for picked files/PDFs).
export async function uploadFlightItinerary(
  file: PickedFile,
  tripId: string,
  userId: string,
): Promise<string> {
  const { ext, contentType } = itineraryExtType(file);
  const path = `${tripId}/${userId}/${Date.now()}.${ext}`;

  let body: ArrayBuffer | Blob;
  if (Platform.OS === "web") {
    body = await (await fetch(file.uri)).blob();
  } else {
    const base64 =
      file.base64 ??
      (await FileSystem.readAsStringAsync(file.uri, { encoding: "base64" }));
    if (!base64) throw new Error("Couldn't read that file — try again.");
    body = decode(base64);
  }

  const { error } = await supabase.storage
    .from(ITINERARY_BUCKET)
    .upload(path, body, { contentType, upsert: true });
  if (error) throw error;

  return path;
}

// Short-lived signed URL so the uploader (or a trip admin) can view a private
// itinerary. Storage RLS still gates who may sign. Returns null on failure.
export async function signedItineraryUrl(
  path: string,
  expiresIn = 60,
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(ITINERARY_BUCKET)
    .createSignedUrl(path, expiresIn);
  if (error) return null;
  return data.signedUrl;
}

function mediaExtType(file: PickedFile): { ext: string; contentType: string } {
  const mime = file.mimeType?.toLowerCase() ?? "";
  const rawExt = (
    file.name?.split(".").pop() ||
    file.uri.split("?")[0].split(".").pop() ||
    ""
  ).toLowerCase();
  let ext = rawExt && rawExt.length <= 4 ? rawExt : "";
  if (!ext) {
    if (mime.startsWith("video")) ext = mime.includes("quicktime") ? "mov" : "mp4";
    else if (mime.includes("png")) ext = "png";
    else if (mime.includes("webp")) ext = "webp";
    else ext = "jpg";
  }
  if (ext === "jpeg") ext = "jpg";
  const isVideo = mime.startsWith("video") || ["mp4", "mov", "m4v", "webm"].includes(ext);
  const contentType =
    file.mimeType ||
    (isVideo
      ? ext === "mov"
        ? "video/quicktime"
        : "video/mp4"
      : ext === "png"
        ? "image/png"
        : ext === "webp"
          ? "image/webp"
          : "image/jpeg");
  return { ext, contentType };
}

// Upload a photo or video to the PRIVATE trip-media bucket under
// `<tripId>/<userId>/…`. Returns the storage PATH (bucket is never public — view
// via signedTripMediaUrl). Cross-platform: web uploads the Blob; native decodes
// base64 (from the picker, or read off disk).
export async function uploadTripMedia(
  file: PickedFile,
  tripId: string,
  userId: string,
): Promise<string> {
  const { ext, contentType } = mediaExtType(file);
  const rand = Math.random().toString(36).slice(2, 8);
  const path = `${tripId}/${userId}/${Date.now()}-${rand}.${ext}`;

  let body: ArrayBuffer | Blob;
  if (Platform.OS === "web") {
    body = await (await fetch(file.uri)).blob();
  } else {
    const base64 =
      file.base64 ??
      (await FileSystem.readAsStringAsync(file.uri, { encoding: "base64" }));
    if (!base64) throw new Error("Couldn't read that file — try again.");
    body = decode(base64);
  }

  const { error } = await supabase.storage
    .from(TRIP_MEDIA_BUCKET)
    .upload(path, body, { contentType, upsert: false });
  if (error) throw error;

  return path;
}

// Short-lived signed URL for private trip media (any trip member may sign, per
// storage RLS). Returns null on failure.
export async function signedTripMediaUrl(
  path: string,
  expiresIn = 3600,
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(TRIP_MEDIA_BUCKET)
    .createSignedUrl(path, expiresIn);
  if (error) return null;
  return data.signedUrl;
}
