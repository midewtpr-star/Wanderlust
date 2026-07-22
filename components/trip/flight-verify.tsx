import { useState } from "react";
import { View, ActivityIndicator, Platform, Pressable } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import * as WebBrowser from "expo-web-browser";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import {
  uploadFlightItinerary,
  signedItineraryUrl,
  type PickedFile,
} from "@/lib/storage";
import type { FlightVerdict } from "@/types";
import { VerifiedAnimation } from "./verified-animation";

type Phase = "idle" | "working" | "result";

// Flight path: upload OR photograph an itinerary → private bucket → verify-flight
// edge function (AI extraction + proximity/name/date checks). Animate on pass;
// show a specific reason + re-upload (+ admin override) on fail.
export function FlightVerify({
  tripId,
  userId,
  isAdmin,
  onVerified,
  onCancel,
  onSelfOverride,
}: {
  tripId: string;
  userId: string;
  isAdmin: boolean;
  onVerified: () => void;
  onCancel: () => void;
  onSelfOverride: () => Promise<boolean>;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [statusText, setStatusText] = useState("");
  const [verdict, setVerdict] = useState<FlightVerdict | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadedPath, setUploadedPath] = useState<string | null>(null);
  const [overriding, setOverriding] = useState(false);

  async function runVerification(file: PickedFile) {
    setError(null);
    setVerdict(null);
    setPhase("working");
    try {
      setStatusText("Uploading your itinerary…");
      const path = await uploadFlightItinerary(file, tripId, userId);
      setUploadedPath(path);

      setStatusText("Reading and verifying…");
      const { data, error: fnErr } =
        await supabase.functions.invoke<FlightVerdict>("verify-flight", {
          body: { trip_id: tripId, path },
        });

      if (fnErr || !data) {
        setError("Verification couldn't run. Please try again.");
        setPhase("result");
        return;
      }
      setVerdict(data);
      setPhase("result");
      if (data.ok) onVerified();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setPhase("result");
    }
  }

  async function pickFile() {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ["image/png", "image/jpeg", "image/webp", "application/pdf"],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (res.canceled || !res.assets?.[0]) return;
      const a = res.assets[0];
      await runVerification({ uri: a.uri, name: a.name, mimeType: a.mimeType });
    } catch {
      setError("Couldn't open that file. Try another.");
    }
  }

  async function takePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      setError("Camera access is needed to photograph your itinerary.");
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      quality: 0.7,
      base64: true,
    });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    await runVerification({
      uri: a.uri,
      name: a.fileName,
      mimeType: a.mimeType,
      base64: a.base64,
    });
  }

  async function viewItinerary() {
    if (!uploadedPath) return;
    const url = await signedItineraryUrl(uploadedPath, 120);
    if (url) await WebBrowser.openBrowserAsync(url);
  }

  async function doSelfOverride() {
    setOverriding(true);
    const ok = await onSelfOverride();
    setOverriding(false);
    if (ok) onVerified();
  }

  // --- working ---
  if (phase === "working") {
    return (
      <View className="items-center gap-3 py-6">
        <ActivityIndicator />
        <Text variant="muted">{statusText}</Text>
      </View>
    );
  }

  // --- result ---
  if (phase === "result") {
    if (verdict?.ok) {
      return (
        <View className="gap-2">
          <VerifiedAnimation />
          <Card className="gap-1">
            {verdict.resolved_city ? (
              <Text className="text-center">
                Arriving in {verdict.resolved_city}
                {verdict.distance_miles != null
                  ? ` · ${verdict.distance_miles} mi from the trip`
                  : ""}
              </Text>
            ) : null}
            {verdict.warnings.map((w, i) => (
              <Text key={i} variant="muted" className="text-center text-xs">
                ⚠️ {w}
              </Text>
            ))}
          </Card>
          {uploadedPath ? (
            <Pressable onPress={viewItinerary}>
              <Text className="text-center text-primary">View your itinerary</Text>
            </Pressable>
          ) : null}
          <Button label="Done" onPress={onCancel} />
        </View>
      );
    }

    // failed / error
    const reason =
      verdict?.reason ?? error ?? "We couldn't verify that itinerary.";
    return (
      <View className="gap-3">
        <Text variant="heading">Couldn&apos;t verify</Text>
        <Card className="gap-1">
          <Text className="text-destructive">{reason}</Text>
          {verdict?.extracted?.arrival_city ? (
            <Text variant="muted" className="text-xs">
              Read arrival: {verdict.extracted.arrival_city}
              {verdict.extracted.arrival_airport_iata
                ? ` (${verdict.extracted.arrival_airport_iata})`
                : ""}
            </Text>
          ) : null}
        </Card>
        {uploadedPath ? (
          <Pressable onPress={viewItinerary}>
            <Text className="text-center text-primary">
              View the file you uploaded
            </Text>
          </Pressable>
        ) : null}
        <Button label="Try another file" onPress={() => setPhase("idle")} />
        {isAdmin ? (
          <Button
            label={overriding ? "Overriding…" : "Admin: override & verify"}
            variant="outline"
            onPress={doSelfOverride}
            disabled={overriding}
          />
        ) : null}
        <Button label="Back" variant="outline" onPress={onCancel} />
      </View>
    );
  }

  // --- idle ---
  return (
    <View className="gap-3">
      <Text variant="heading">Verify your flight</Text>
      <Text variant="muted">
        Upload or photograph your e-ticket, boarding pass, or booking
        confirmation. We&apos;ll check the arrival matches the trip. Your
        itinerary stays private — only you and trip admins can see it.
      </Text>
      <Button label="Upload file (image or PDF)" onPress={pickFile} />
      {Platform.OS !== "web" ? (
        <Button label="Take a photo" variant="secondary" onPress={takePhoto} />
      ) : null}
      {error ? <Text className="text-destructive">{error}</Text> : null}
      <Button label="Back" variant="outline" onPress={onCancel} />
    </View>
  );
}
