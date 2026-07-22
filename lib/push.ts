import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { supabase } from "@/lib/supabase";

// Push plumbing for chat (D10). Minimal + best-effort: registering a token and
// firing the fan-out both no-op gracefully when push isn't fully configured yet
// (web, simulators, or no EAS projectId), so the chat is never blocked.
//
// ⚙️  TO ENABLE REAL PUSH DELIVERY you need EAS credentials:
//   1. `eas init` (sets extra.eas.projectId in app config),
//   2. iOS: an APNs key via `eas credentials`; Android: FCM v1 credentials,
//   3. deploy the fan-out function: `supabase functions deploy notify-message`.
// Until then everything below is inert and the chat still works end to end.

// Foreground display: show an incoming chat notification as a banner. (A
// presence-aware refinement — suppress it while the user is actively viewing
// that very chat — is a clean follow-up; noted at the send site too.)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

let registered = false;

function easProjectId(): string | undefined {
  return (
    (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)
      ?.eas?.projectId ?? Constants.easConfig?.projectId ?? undefined
  );
}

// Register this device's Expo push token so notify-message can reach the user.
// Safe to call repeatedly (guarded); returns silently when push isn't available.
export async function registerPushTokenAsync(): Promise<void> {
  try {
    if (registered) return;
    if (Platform.OS === "web") return; // web push isn't wired in MVP (D10, §12-10)
    if (!Device.isDevice) return; // simulators/emulators can't get a real token

    const projectId = easProjectId();
    if (!projectId) {
      console.warn(
        "[push] No EAS projectId — skipping token registration. Run `eas init` " +
          "and set extra.eas.projectId to enable push notifications.",
      );
      return;
    }

    const current = await Notifications.getPermissionsAsync();
    let status = current.status;
    if (status !== "granted") {
      status = (await Notifications.requestPermissionsAsync()).status;
    }
    if (status !== "granted") return;

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Messages",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid || !token) return;

    await supabase.from("push_tokens").upsert(
      { user_id: uid, token, platform: Platform.OS as "ios" | "android" | "web" },
      { onConflict: "user_id,token" },
    );
    registered = true;
  } catch (e) {
    // Never surface push setup errors into the chat UX.
    console.warn("[push] token registration skipped:", e);
  }
}

// Ask the edge function to notify the OTHER trip members about a new message.
// Fire-and-forget: the chat must not wait on (or fail because of) push.
export function notifyNewMessage(tripId: string, messageId: string): void {
  supabase.functions
    .invoke("notify-message", {
      body: { trip_id: tripId, message_id: messageId },
    })
    .catch(() => {
      /* best-effort — ignore (function not deployed, offline, etc.) */
    });
}
